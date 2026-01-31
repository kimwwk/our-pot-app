import { ulid } from "ulid";
import { BaseRepository } from "./BaseRepository";
import { ChangeSet, ChangeRequest } from "../types";
import { classifyError } from "@/lib/ai/errorClassification";
import type { ExecutionError } from "@/lib/ai/types";

export class ChangeSetRepository extends BaseRepository {

    // SECURITY: Whitelist of allowed column names per entity type to prevent SQL injection
    // Column names from proposed_data JSON are validated against this whitelist
    private static readonly ALLOWED_COLUMNS: Readonly<Record<string, ReadonlySet<string>>> = {
        transaction: new Set(['id', 'account_id', 'member_id', 'category_id', 'type', 'amount', 'merchant', 'description', 'note', 'date', 'status', 'created_at', 'updated_at', 'deleted_at']),
        category: new Set(['id', 'account_id', 'name', 'icon', 'color', 'created_at', 'updated_at', 'deleted_at']),
        member: new Set(['id', 'account_id', 'name', 'role', 'is_kitty', 'avatar_url', 'email', 'created_at', 'updated_at', 'deleted_at']),
        account: new Set(['id', 'name', 'emoji', 'currency', 'balance', 'created_at', 'updated_at', 'deleted_at'])
    };

    // SECURITY: Validates column names against whitelist to prevent SQL injection
    private validateColumns(entityType: string, columns: string[]): void {
        const allowed = ChangeSetRepository.ALLOWED_COLUMNS[entityType];
        if (!allowed) {
            throw new Error(`Unknown entity type: ${entityType}`);
        }

        for (const col of columns) {
            if (!allowed.has(col)) {
                throw new Error(`Invalid column "${col}" for entity type "${entityType}"`);
            }
            // Additional regex check for identifier safety (defense in depth)
            if (!/^[a-z_][a-z0-9_]*$/i.test(col)) {
                throw new Error(`Invalid column name format: "${col}"`);
            }
        }
    }

    async create(changeset: ChangeSet, requests: ChangeRequest[]): Promise<void> {
        try {
            // Use executeSet for batch operations instead of manual transaction management
            // Capacitor SQLite handles atomicity internally for executeSet
            const statements: { statement: string; values: any[] }[] = [];

            // Insert changeset
            statements.push({
                statement: `INSERT INTO changesets (id, status, source, title, description, tool_call_id, proposed_at, reviewed_at, rejection_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                values: [changeset.id, changeset.status, changeset.source, changeset.title, changeset.description, changeset.tool_call_id, changeset.proposed_at, changeset.reviewed_at, changeset.rejection_reason]
            });

            // Insert change requests
            for (const req of requests) {
                statements.push({
                    statement: `INSERT INTO change_requests (id, changeset_id, operation_type, entity_type, entity_id, current_data, proposed_data, execution_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    values: [req.id, req.changeset_id, req.operation_type, req.entity_type, req.entity_id, req.current_data, req.proposed_data, req.execution_order, req.created_at]
                });
            }

            // Execute as a batch - Capacitor SQLite handles this atomically
            await this.db.executeSet(statements);
        } catch (error) {
            console.error('Failed to create changeset:', error);
            throw error;
        }
    }

    async getById(id: string): Promise<ChangeSet | null> {
        return this.executeSingle<ChangeSet>(
            `SELECT * FROM changesets WHERE id = ?`,
            [id]
        );
    }

    async getRequests(changesetId: string): Promise<ChangeRequest[]> {
        return this.executeQuery<ChangeRequest>(
            `SELECT * FROM change_requests WHERE changeset_id = ? ORDER BY execution_order ASC`,
            [changesetId]
        );
    }

    async updateStatus(id: string, status: string, reviewedAt?: string, rejectionReason?: string): Promise<void> {
        await this.executeNonQuery(
            `UPDATE changesets SET status = ?, reviewed_at = ?, rejection_reason = ? WHERE id = ?`,
            [status, reviewedAt, rejectionReason, id]
        );
    }

    async getByStatus(status: string): Promise<ChangeSet[]> {
        return this.executeQuery<ChangeSet>(
            `SELECT * FROM changesets WHERE status = ? ORDER BY proposed_at DESC`,
            [status]
        );
    }

    async getApprovedByAccount(limit: number = 20): Promise<ChangeSet[]> {
        // Audit trail mainly
        return this.executeQuery<ChangeSet>(
            `SELECT * FROM changesets WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT ?`,
            [limit]
        );
    }

    // Atomic Application of Changeset
    // BUG-011 FIX: Ensures atomicity by setting intermediate 'executing' state
    // before batch execution, preventing orphaned changesets in 'pending_approval'
    // BUG-012 FIX: Returns classified ExecutionError for AI recovery strategies
    async applyChangeSet(id: string): Promise<{ success: true } | { success: false; error: ExecutionError }> {
        // Step 1: Validate changeset exists and is in correct state
        const changeset = await this.getById(id);
        if (!changeset) {
            return {
                success: false,
                error: classifyError(new Error(`Changeset ${id} not found`)),
            };
        }
        if (changeset.status !== 'pending_approval') {
            return {
                success: false,
                error: classifyError(new Error(`Changeset ${id} is in '${changeset.status}' state, expected 'pending_approval'`)),
            };
        }

        const requests = await this.getRequests(id);
        if (!requests || requests.length === 0) {
            return {
                success: false,
                error: classifyError(new Error(`No change requests found for changeset ${id}. The changeset may not have been persisted to the database.`)),
            };
        }

        // Step 2: Transition to 'executing' state BEFORE batch execution
        // This prevents orphaned changesets - if batch fails, status is 'executing' not 'pending_approval'
        await this.executeNonQuery(
            `UPDATE changesets SET status = 'executing' WHERE id = ?`,
            [id]
        );

        try {
            // Step 3: Build all SQL statements for batch execution
            const statements: { statement: string; values: any[] }[] = [];

            for (const req of requests) {
                const data = req.proposed_data ? JSON.parse(req.proposed_data) : {};

                // SECURITY: Validate entity type before any SQL construction
                const validEntityTypes = ['transaction', 'category', 'member', 'account'];
                if (!validEntityTypes.includes(req.entity_type)) {
                    return {
                        success: false,
                        error: classifyError(new Error(`Invalid entity type: ${req.entity_type}`)),
                    };
                }

                switch (req.operation_type) {
                    case 'create':
                        // Replace temp IDs with real ULIDs before inserting
                        if (data.id && typeof data.id === 'string' && data.id.startsWith('temp-')) {
                            data.id = ulid();
                        }
                        // SECURITY: Validate column names before building SQL
                        const createColumns = Object.keys(data);
                        this.validateColumns(req.entity_type, createColumns);
                        const columns = createColumns.join(', ');
                        const placeholders = createColumns.map(() => '?').join(', ');
                        const values = Object.values(data);
                        statements.push({
                            statement: `INSERT INTO ${this.getTableName(req.entity_type)} (${columns}) VALUES (${placeholders})`,
                            values: values
                        });
                        break;

                    case 'update':
                        // SECURITY: Validate column names before building SQL
                        const updateColumns = Object.keys(data).filter(k => k !== 'id');
                        this.validateColumns(req.entity_type, updateColumns);
                        const updateFields = updateColumns.map(k => `${k} = ?`).join(', ');
                        const updateValues = updateColumns.map(k => data[k]);
                        statements.push({
                            statement: `UPDATE ${this.getTableName(req.entity_type)} SET ${updateFields} WHERE id = ?`,
                            values: [...updateValues, req.entity_id]
                        });
                        break;

                    case 'delete':
                        // Soft delete - no dynamic columns, safe
                        const now = new Date().toISOString();
                        statements.push({
                            statement: `UPDATE ${this.getTableName(req.entity_type)} SET deleted_at = ? WHERE id = ?`,
                            values: [now, req.entity_id]
                        });
                        break;
                }
            }

            // Step 4: Update changeset status to approved (included in batch for atomicity)
            statements.push({
                statement: `UPDATE changesets SET status = 'approved', reviewed_at = ? WHERE id = ?`,
                values: [new Date().toISOString(), id]
            });

            // Step 5: Execute all statements atomically using executeSet
            // Capacitor SQLite handles transaction management internally
            await this.db.executeSet(statements);

            return { success: true };

        } catch (error) {
            console.error(`Failed to apply changeset ${id}`, error);

            // BUG-012: Classify the error for AI recovery
            // Try to determine which request failed based on error context
            const classifiedError = classifyError(error, {
                // Note: SQLite batch doesn't tell us which statement failed
                // We classify based on error message patterns
            });

            // Step 6: Mark as failed - changeset is already in 'executing' state,
            // so even if this fails, it won't be orphaned in 'pending_approval'
            try {
                await this.executeNonQuery(
                    `UPDATE changesets SET status = 'execution_failed', reviewed_at = ? WHERE id = ?`,
                    [new Date().toISOString(), id]
                );
            } catch (updateError) {
                // Changeset remains in 'executing' state - not ideal but recoverable
                // A cleanup job could find 'executing' changesets older than X minutes
                console.error(`Failed to update changeset status to execution_failed:`, updateError);
            }

            return { success: false, error: classifiedError };
        }
    }

    private getTableName(entityType: string): string {
        switch (entityType) {
            case 'transaction': return 'transactions';
            case 'category': return 'categories';
            case 'member': return 'members';
            case 'account': return 'accounts';
            default: throw new Error(`Unknown entity type: ${entityType}`);
        }
    }
}
