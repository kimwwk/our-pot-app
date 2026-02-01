/**
 * Error classification for AI recovery strategies
 *
 * BUG-012: Implements taxonomy to distinguish:
 * - Transient errors (DB locked) - AI can auto-retry
 * - Logic errors (FK violation) - AI needs to fix changeset
 * - Critical errors - AI should abort and ask user
 */

import type { ErrorType, ExecutionError } from './types';

/**
 * SQLite error codes and patterns for classification
 */
const ERROR_PATTERNS: Array<{
    pattern: RegExp;
    type: ErrorType;
    code: string;
    getDetails?: (match: RegExpMatchArray) => Record<string, unknown>;
}> = [
    // Foreign key constraint violations
    {
        pattern: /FOREIGN KEY constraint failed/i,
        type: 'CONSTRAINT',
        code: 'FOREIGN_KEY_VIOLATION',
    },
    {
        pattern: /foreign key constraint/i,
        type: 'CONSTRAINT',
        code: 'FOREIGN_KEY_VIOLATION',
    },
    // Unique constraint violations
    {
        pattern: /UNIQUE constraint failed[:\s]*(\w+)\.(\w+)/i,
        type: 'CONSTRAINT',
        code: 'UNIQUE_CONSTRAINT',
        getDetails: (match) => ({
            table: match[1],
            column: match[2],
        }),
    },
    {
        pattern: /duplicate key|already exists/i,
        type: 'CONSTRAINT',
        code: 'UNIQUE_CONSTRAINT',
    },
    // NOT NULL constraint violations
    {
        pattern: /NOT NULL constraint failed[:\s]*(\w+)\.(\w+)/i,
        type: 'VALIDATION',
        code: 'NOT_NULL_VIOLATION',
        getDetails: (match) => ({
            table: match[1],
            column: match[2],
        }),
    },
    // CHECK constraint violations (including triggers)
    {
        pattern: /CHECK constraint failed|constraint failed/i,
        type: 'VALIDATION',
        code: 'CHECK_CONSTRAINT',
    },
    // Trigger abort (e.g., "Only one kitty member allowed per account")
    {
        pattern: /ABORT\s*-?\s*(.+)/i,
        type: 'VALIDATION',
        code: 'TRIGGER_ABORT',
        getDetails: (match) => ({
            triggerMessage: match[1]?.trim(),
        }),
    },
    // Database locked (transient)
    {
        pattern: /database is locked|SQLITE_BUSY|SQLITE_LOCKED/i,
        type: 'TRANSIENT',
        code: 'DB_LOCKED',
    },
    // Connection/network issues (transient)
    {
        pattern: /connection|timeout|network|SQLITE_IOERR/i,
        type: 'TRANSIENT',
        code: 'CONNECTION_ERROR',
    },
    // Entity not found
    {
        pattern: /not found|does not exist|no such/i,
        type: 'NOT_FOUND',
        code: 'ENTITY_NOT_FOUND',
    },
    // Stale state / optimistic concurrency
    {
        pattern: /concurrent|modified|stale|version mismatch/i,
        type: 'STALE_STATE',
        code: 'OPTIMISTIC_LOCK_FAILURE',
    },
    // Security validation errors (from our column whitelist)
    {
        pattern: /Invalid column|Unknown entity type/i,
        type: 'VALIDATION',
        code: 'INVALID_SCHEMA',
    },
    {
        pattern: /Changeset .+ is in '(\w+)' state, expected/i,
        type: 'VALIDATION',
        code: 'INVALID_STATE',
        getDetails: (match) => ({
            actualState: match[1],
        }),
    },
];

/**
 * Classify a raw error into a structured ExecutionError
 */
export function classifyError(
    error: unknown,
    context?: {
        failedRequestId?: string;
        entityType?: string;
        entityId?: string;
    }
): ExecutionError {
    // Extract error message with safe handling for objects
    let rawMessage: string;
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    } else if (typeof error === 'object' && error !== null) {
        rawMessage = 'Unknown database error occurred';
    } else {
        rawMessage = String(error);
    }

    // SECURITY: Limit message length to prevent ReDoS attacks
    const message = rawMessage.slice(0, 1000);

    // Try to match against known patterns
    for (const { pattern, type, code, getDetails } of ERROR_PATTERNS) {
        const match = message.match(pattern);
        if (match) {
            return {
                type,
                code,
                message,
                failedRequestId: context?.failedRequestId,
                details: {
                    entityType: context?.entityType,
                    entityId: context?.entityId,
                    ...(getDetails ? getDetails(match) : {}),
                },
            };
        }
    }

    // Default to CRITICAL for unrecognized errors
    return {
        type: 'CRITICAL',
        code: 'UNKNOWN_ERROR',
        message,
        failedRequestId: context?.failedRequestId,
        details: {
            entityType: context?.entityType,
            entityId: context?.entityId,
            originalError: error instanceof Error ? error.name : typeof error,
        },
    };
}

/**
 * Check if an error is transient and can be auto-retried
 */
export function isTransientError(error: ExecutionError): boolean {
    return error.type === 'TRANSIENT';
}

/**
 * Check if an error is recoverable by modifying the changeset
 */
export function isRecoverableError(error: ExecutionError): boolean {
    return error.type === 'CONSTRAINT' ||
           error.type === 'VALIDATION' ||
           error.type === 'NOT_FOUND' ||
           error.type === 'STALE_STATE';
}

/**
 * Get human-readable recovery suggestions for the AI
 */
export function getRecoverySuggestion(error: ExecutionError): string {
    switch (error.code) {
        case 'FOREIGN_KEY_VIOLATION':
            return 'The referenced entity (member, category, or account) does not exist. Use getMembers() or getCategories() to find valid IDs, or create the missing entity first.';

        case 'UNIQUE_CONSTRAINT':
            return `An entity with this identifier already exists${error.details?.column ? ` (${error.details.column})` : ''}. Use a different value or update the existing entity instead.`;

        case 'NOT_NULL_VIOLATION':
            return `Required field "${error.details?.column || 'unknown'}" is missing. Provide a value for this field.`;

        case 'CHECK_CONSTRAINT':
        case 'TRIGGER_ABORT':
            return `Business rule violation: ${error.details?.triggerMessage || error.message}. Adjust the changeset to comply with the rule.`;

        case 'DB_LOCKED':
            return 'The database is temporarily locked. You can retry the same changeset.';

        case 'CONNECTION_ERROR':
            return 'Connection issue occurred. You can retry the same changeset.';

        case 'ENTITY_NOT_FOUND':
            return 'The target entity was not found. It may have been deleted. Use search tools to find valid entities.';

        case 'OPTIMISTIC_LOCK_FAILURE':
            return 'The entity was modified by another operation. Re-fetch the current state and rebuild the changeset.';

        case 'INVALID_SCHEMA':
            return 'Invalid field names in the changeset. Check the entity structure and use only valid column names.';

        case 'INVALID_STATE':
            return `Changeset is in an unexpected state (${error.details?.actualState}). This may require user intervention.`;

        default:
            return 'An unexpected error occurred. Ask the user how they would like to proceed.';
    }
}
