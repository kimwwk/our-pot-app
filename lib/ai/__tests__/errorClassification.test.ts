/**
 * Unit tests for error classification (BUG-012)
 *
 * Tests the taxonomy that distinguishes between:
 * - Transient errors (DB locked) - AI can auto-retry
 * - Logic errors (FK violation) - AI needs to fix changeset
 * - Critical errors - AI should abort and ask user
 */

import {
    classifyError,
    isTransientError,
    isRecoverableError,
    getRecoverySuggestion,
} from '../errorClassification';
import type { ExecutionError } from '../types';

describe('errorClassification', () => {
    describe('classifyError', () => {
        describe('CONSTRAINT errors', () => {
            it('should classify FOREIGN KEY constraint failures', () => {
                const error = new Error('FOREIGN KEY constraint failed');
                const result = classifyError(error);

                expect(result.type).toBe('CONSTRAINT');
                expect(result.code).toBe('FOREIGN_KEY_VIOLATION');
                expect(result.message).toContain('FOREIGN KEY');
            });

            it('should classify foreign key constraint with different wording', () => {
                const error = new Error('foreign key constraint violation');
                const result = classifyError(error);

                expect(result.type).toBe('CONSTRAINT');
                expect(result.code).toBe('FOREIGN_KEY_VIOLATION');
            });

            it('should classify UNIQUE constraint failures and extract details', () => {
                const error = new Error('UNIQUE constraint failed: transactions.merchant');
                const result = classifyError(error);

                expect(result.type).toBe('CONSTRAINT');
                expect(result.code).toBe('UNIQUE_CONSTRAINT');
                expect(result.details?.table).toBe('transactions');
                expect(result.details?.column).toBe('merchant');
            });

            it('should classify UNIQUE constraint with alternative wording', () => {
                const error = new Error('duplicate key value violates unique constraint');
                const result = classifyError(error);

                expect(result.type).toBe('CONSTRAINT');
                expect(result.code).toBe('UNIQUE_CONSTRAINT');
            });

            it('should classify "already exists" errors as UNIQUE constraint', () => {
                const error = new Error('Entity already exists');
                const result = classifyError(error);

                expect(result.type).toBe('CONSTRAINT');
                expect(result.code).toBe('UNIQUE_CONSTRAINT');
            });
        });

        describe('VALIDATION errors', () => {
            it('should classify NOT NULL constraint failures and extract details', () => {
                const error = new Error('NOT NULL constraint failed: categories.name');
                const result = classifyError(error);

                expect(result.type).toBe('VALIDATION');
                expect(result.code).toBe('NOT_NULL_VIOLATION');
                expect(result.details?.table).toBe('categories');
                expect(result.details?.column).toBe('name');
            });

            it('should classify CHECK constraint failures', () => {
                const error = new Error('CHECK constraint failed: amount > 0');
                const result = classifyError(error);

                expect(result.type).toBe('VALIDATION');
                expect(result.code).toBe('CHECK_CONSTRAINT');
            });

            it('should classify trigger ABORT with custom message', () => {
                const error = new Error('ABORT - Only one kitty member allowed per account');
                const result = classifyError(error);

                expect(result.type).toBe('VALIDATION');
                expect(result.code).toBe('TRIGGER_ABORT');
                expect(result.details?.triggerMessage).toBe('Only one kitty member allowed per account');
            });

            it('should classify trigger ABORT with variations', () => {
                const error = new Error('ABORT: Invalid transaction date');
                const result = classifyError(error);

                expect(result.type).toBe('VALIDATION');
                expect(result.code).toBe('TRIGGER_ABORT');
                expect(result.details?.triggerMessage).toContain('Invalid transaction date');
            });

            it('should classify invalid schema errors', () => {
                const error = new Error('Invalid column: foo');
                const result = classifyError(error);

                expect(result.type).toBe('VALIDATION');
                expect(result.code).toBe('INVALID_SCHEMA');
            });

            it('should classify invalid state errors and extract state', () => {
                const error = new Error("Changeset xyz is in 'approved' state, expected 'pending_approval'");
                const result = classifyError(error);

                expect(result.type).toBe('VALIDATION');
                expect(result.code).toBe('INVALID_STATE');
                expect(result.details?.actualState).toBe('approved');
            });
        });

        describe('TRANSIENT errors', () => {
            it('should classify database locked errors', () => {
                const error = new Error('database is locked');
                const result = classifyError(error);

                expect(result.type).toBe('TRANSIENT');
                expect(result.code).toBe('DB_LOCKED');
            });

            it('should classify SQLITE_BUSY errors', () => {
                const error = new Error('SQLITE_BUSY: database is busy');
                const result = classifyError(error);

                expect(result.type).toBe('TRANSIENT');
                expect(result.code).toBe('DB_LOCKED');
            });

            it('should classify SQLITE_LOCKED errors', () => {
                const error = new Error('SQLITE_LOCKED');
                const result = classifyError(error);

                expect(result.type).toBe('TRANSIENT');
                expect(result.code).toBe('DB_LOCKED');
            });

            it('should classify connection errors', () => {
                const error = new Error('connection timeout');
                const result = classifyError(error);

                expect(result.type).toBe('TRANSIENT');
                expect(result.code).toBe('CONNECTION_ERROR');
            });

            it('should classify network errors', () => {
                const error = new Error('network error occurred');
                const result = classifyError(error);

                expect(result.type).toBe('TRANSIENT');
                expect(result.code).toBe('CONNECTION_ERROR');
            });

            it('should classify SQLITE_IOERR errors', () => {
                const error = new Error('SQLITE_IOERR: disk I/O error');
                const result = classifyError(error);

                expect(result.type).toBe('TRANSIENT');
                expect(result.code).toBe('CONNECTION_ERROR');
            });
        });

        describe('NOT_FOUND errors', () => {
            it('should classify "not found" errors', () => {
                const error = new Error('Entity not found');
                const result = classifyError(error);

                expect(result.type).toBe('NOT_FOUND');
                expect(result.code).toBe('ENTITY_NOT_FOUND');
            });

            it('should classify "does not exist" errors', () => {
                const error = new Error('Transaction does not exist');
                const result = classifyError(error);

                expect(result.type).toBe('NOT_FOUND');
                expect(result.code).toBe('ENTITY_NOT_FOUND');
            });

            it('should classify "no such" errors', () => {
                const error = new Error('no such table: transactions');
                const result = classifyError(error);

                expect(result.type).toBe('NOT_FOUND');
                expect(result.code).toBe('ENTITY_NOT_FOUND');
            });
        });

        describe('STALE_STATE errors', () => {
            it('should classify concurrent modification errors', () => {
                const error = new Error('concurrent modification detected');
                const result = classifyError(error);

                expect(result.type).toBe('STALE_STATE');
                expect(result.code).toBe('OPTIMISTIC_LOCK_FAILURE');
            });

            it('should classify "modified" errors', () => {
                const error = new Error('Entity was modified by another user');
                const result = classifyError(error);

                expect(result.type).toBe('STALE_STATE');
                expect(result.code).toBe('OPTIMISTIC_LOCK_FAILURE');
            });

            it('should classify stale state errors', () => {
                const error = new Error('stale state detected');
                const result = classifyError(error);

                expect(result.type).toBe('STALE_STATE');
                expect(result.code).toBe('OPTIMISTIC_LOCK_FAILURE');
            });

            it('should classify version mismatch errors', () => {
                const error = new Error('version mismatch');
                const result = classifyError(error);

                expect(result.type).toBe('STALE_STATE');
                expect(result.code).toBe('OPTIMISTIC_LOCK_FAILURE');
            });
        });

        describe('CRITICAL errors', () => {
            it('should classify unrecognized errors as CRITICAL', () => {
                const error = new Error('Something went terribly wrong');
                const result = classifyError(error);

                expect(result.type).toBe('CRITICAL');
                expect(result.code).toBe('UNKNOWN_ERROR');
                expect(result.message).toBe('Something went terribly wrong');
            });

            it('should handle string errors', () => {
                const result = classifyError('Random error string');

                expect(result.type).toBe('CRITICAL');
                expect(result.code).toBe('UNKNOWN_ERROR');
                expect(result.message).toBe('Random error string');
            });

            it('should handle non-Error objects', () => {
                const result = classifyError({ foo: 'bar' });

                expect(result.type).toBe('CRITICAL');
                expect(result.code).toBe('UNKNOWN_ERROR');
                expect(result.details?.originalError).toBe('object');
            });
        });

        describe('context handling', () => {
            it('should include failedRequestId in result', () => {
                const error = new Error('Test error');
                const result = classifyError(error, {
                    failedRequestId: 'req-123',
                });

                expect(result.failedRequestId).toBe('req-123');
            });

            it('should include entityType and entityId in details', () => {
                const error = new Error('FOREIGN KEY constraint failed');
                const result = classifyError(error, {
                    entityType: 'transaction',
                    entityId: 'tx-456',
                });

                expect(result.details?.entityType).toBe('transaction');
                expect(result.details?.entityId).toBe('tx-456');
            });

            it('should merge context with pattern-extracted details', () => {
                const error = new Error('UNIQUE constraint failed: categories.name');
                const result = classifyError(error, {
                    entityType: 'category',
                    entityId: 'cat-789',
                });

                expect(result.details?.entityType).toBe('category');
                expect(result.details?.entityId).toBe('cat-789');
                expect(result.details?.table).toBe('categories');
                expect(result.details?.column).toBe('name');
            });
        });
    });

    describe('isTransientError', () => {
        it('should return true for TRANSIENT errors', () => {
            const error: ExecutionError = {
                type: 'TRANSIENT',
                code: 'DB_LOCKED',
                message: 'database is locked',
            };

            expect(isTransientError(error)).toBe(true);
        });

        it('should return false for CONSTRAINT errors', () => {
            const error: ExecutionError = {
                type: 'CONSTRAINT',
                code: 'FOREIGN_KEY_VIOLATION',
                message: 'FK constraint failed',
            };

            expect(isTransientError(error)).toBe(false);
        });

        it('should return false for VALIDATION errors', () => {
            const error: ExecutionError = {
                type: 'VALIDATION',
                code: 'NOT_NULL_VIOLATION',
                message: 'NOT NULL constraint failed',
            };

            expect(isTransientError(error)).toBe(false);
        });

        it('should return false for CRITICAL errors', () => {
            const error: ExecutionError = {
                type: 'CRITICAL',
                code: 'UNKNOWN_ERROR',
                message: 'Unknown error',
            };

            expect(isTransientError(error)).toBe(false);
        });
    });

    describe('isRecoverableError', () => {
        it('should return true for CONSTRAINT errors', () => {
            const error: ExecutionError = {
                type: 'CONSTRAINT',
                code: 'FOREIGN_KEY_VIOLATION',
                message: 'FK constraint failed',
            };

            expect(isRecoverableError(error)).toBe(true);
        });

        it('should return true for VALIDATION errors', () => {
            const error: ExecutionError = {
                type: 'VALIDATION',
                code: 'NOT_NULL_VIOLATION',
                message: 'NOT NULL constraint failed',
            };

            expect(isRecoverableError(error)).toBe(true);
        });

        it('should return true for NOT_FOUND errors', () => {
            const error: ExecutionError = {
                type: 'NOT_FOUND',
                code: 'ENTITY_NOT_FOUND',
                message: 'Entity not found',
            };

            expect(isRecoverableError(error)).toBe(true);
        });

        it('should return true for STALE_STATE errors', () => {
            const error: ExecutionError = {
                type: 'STALE_STATE',
                code: 'OPTIMISTIC_LOCK_FAILURE',
                message: 'Concurrent modification',
            };

            expect(isRecoverableError(error)).toBe(true);
        });

        it('should return false for TRANSIENT errors', () => {
            const error: ExecutionError = {
                type: 'TRANSIENT',
                code: 'DB_LOCKED',
                message: 'database is locked',
            };

            expect(isRecoverableError(error)).toBe(false);
        });

        it('should return false for CRITICAL errors', () => {
            const error: ExecutionError = {
                type: 'CRITICAL',
                code: 'UNKNOWN_ERROR',
                message: 'Unknown error',
            };

            expect(isRecoverableError(error)).toBe(false);
        });
    });

    describe('getRecoverySuggestion', () => {
        it('should provide suggestion for FOREIGN_KEY_VIOLATION', () => {
            const error: ExecutionError = {
                type: 'CONSTRAINT',
                code: 'FOREIGN_KEY_VIOLATION',
                message: 'FK constraint failed',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('referenced entity');
            expect(suggestion).toContain('getMembers()');
            expect(suggestion).toContain('getCategories()');
        });

        it('should provide suggestion for UNIQUE_CONSTRAINT', () => {
            const error: ExecutionError = {
                type: 'CONSTRAINT',
                code: 'UNIQUE_CONSTRAINT',
                message: 'UNIQUE constraint failed',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('already exists');
            expect(suggestion).toContain('different value');
        });

        it('should include column name in UNIQUE_CONSTRAINT suggestion if available', () => {
            const error: ExecutionError = {
                type: 'CONSTRAINT',
                code: 'UNIQUE_CONSTRAINT',
                message: 'UNIQUE constraint failed',
                details: { column: 'email' },
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('email');
        });

        it('should provide suggestion for NOT_NULL_VIOLATION', () => {
            const error: ExecutionError = {
                type: 'VALIDATION',
                code: 'NOT_NULL_VIOLATION',
                message: 'NOT NULL constraint failed',
                details: { column: 'description' },
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('Required field');
            expect(suggestion).toContain('description');
        });

        it('should provide suggestion for CHECK_CONSTRAINT', () => {
            const error: ExecutionError = {
                type: 'VALIDATION',
                code: 'CHECK_CONSTRAINT',
                message: 'CHECK constraint failed',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('Business rule violation');
        });

        it('should provide suggestion for TRIGGER_ABORT', () => {
            const error: ExecutionError = {
                type: 'VALIDATION',
                code: 'TRIGGER_ABORT',
                message: 'ABORT - Only one kitty member allowed',
                details: { triggerMessage: 'Only one kitty member allowed' },
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('Business rule violation');
            expect(suggestion).toContain('Only one kitty member allowed');
        });

        it('should provide suggestion for DB_LOCKED', () => {
            const error: ExecutionError = {
                type: 'TRANSIENT',
                code: 'DB_LOCKED',
                message: 'database is locked',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('temporarily locked');
            expect(suggestion).toContain('retry');
        });

        it('should provide suggestion for CONNECTION_ERROR', () => {
            const error: ExecutionError = {
                type: 'TRANSIENT',
                code: 'CONNECTION_ERROR',
                message: 'connection timeout',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('Connection issue');
            expect(suggestion).toContain('retry');
        });

        it('should provide suggestion for ENTITY_NOT_FOUND', () => {
            const error: ExecutionError = {
                type: 'NOT_FOUND',
                code: 'ENTITY_NOT_FOUND',
                message: 'Entity not found',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('not found');
            expect(suggestion).toContain('search tools');
        });

        it('should provide suggestion for OPTIMISTIC_LOCK_FAILURE', () => {
            const error: ExecutionError = {
                type: 'STALE_STATE',
                code: 'OPTIMISTIC_LOCK_FAILURE',
                message: 'concurrent modification',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('modified by another operation');
            expect(suggestion).toContain('Re-fetch');
        });

        it('should provide suggestion for INVALID_SCHEMA', () => {
            const error: ExecutionError = {
                type: 'VALIDATION',
                code: 'INVALID_SCHEMA',
                message: 'Invalid column',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('Invalid field names');
            expect(suggestion).toContain('valid column names');
        });

        it('should provide suggestion for INVALID_STATE', () => {
            const error: ExecutionError = {
                type: 'VALIDATION',
                code: 'INVALID_STATE',
                message: 'Invalid state',
                details: { actualState: 'approved' },
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('unexpected state');
            expect(suggestion).toContain('approved');
        });

        it('should provide default suggestion for UNKNOWN_ERROR', () => {
            const error: ExecutionError = {
                type: 'CRITICAL',
                code: 'UNKNOWN_ERROR',
                message: 'Something went wrong',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('unexpected error');
            expect(suggestion).toContain('Ask the user');
        });

        it('should provide default suggestion for unrecognized error codes', () => {
            const error: ExecutionError = {
                type: 'CRITICAL',
                code: 'SOME_RANDOM_CODE',
                message: 'Random error',
            };

            const suggestion = getRecoverySuggestion(error);

            expect(suggestion).toContain('unexpected error');
        });
    });
});
