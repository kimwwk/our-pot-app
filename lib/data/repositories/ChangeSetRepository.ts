import { ulid } from "ulid";
import { BaseRepository } from "./BaseRepository";
import { ChangeSet, ChangeRequest } from "../types";

export class ChangeSetRepository extends BaseRepository {

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
    async applyChangeSet(id: string): Promise<void> {
        // Step 1: Validate changeset exists and is in correct state
        const changeset = await this.getById(id);
        if (!changeset) {
            throw new Error(`Changeset ${id} not found`);
        }
        if (changeset.status !== 'pending_approval') {
            throw new Error(`Changeset ${id} is in '${changeset.status}' state, expected 'pending_approval'`);
        }

        const requests = await this.getRequests(id);
        if (!requests || requests.length === 0) {
            throw new Error(`No change requests found for changeset ${id}. The changeset may not have been persisted to the database.`);
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

                switch (req.operation_type) {
                    case 'create':
                        // Replace temp IDs with real ULIDs before inserting
                        if (data.id && typeof data.id === 'string' && data.id.startsWith('temp-')) {
                            data.id = ulid();
                        }
                        const columns = Object.keys(data).join(', ');
                        const placeholders = Object.keys(data).map(() => '?').join(', ');
                        const values = Object.values(data);
                        statements.push({
                            statement: `INSERT INTO ${this.getTableName(req.entity_type)} (${columns}) VALUES (${placeholders})`,
                            values: values
                        });
                        break;

                    case 'update':
                        const updateFields = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
                        const updateValues = Object.keys(data).filter(k => k !== 'id').map(k => data[k]);
                        statements.push({
                            statement: `UPDATE ${this.getTableName(req.entity_type)} SET ${updateFields} WHERE id = ?`,
                            values: [...updateValues, req.entity_id]
                        });
                        break;

                    case 'delete':
                        // Soft delete
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

        } catch (error) {
            console.error(`Failed to apply changeset ${id}`, error);

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

            throw error;
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
