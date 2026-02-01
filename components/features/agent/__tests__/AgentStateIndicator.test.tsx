/**
 * Unit tests for AgentStateIndicator (BL-022)
 *
 * Tests the agent state derivation logic for all state combinations
 *
 * NOTE: React Testing Library (@testing-library/react) is required to run these tests.
 * Install with: npm install --save-dev @testing-library/react @testing-library/user-event
 */

import { deriveAgentState, type AgentState } from '../AgentStateIndicator';
import type { ChangeSetStatus, ExecutionError } from '@/lib/ai/types';

describe('AgentStateIndicator', () => {
    describe('deriveAgentState', () => {
        describe('invalid_input state', () => {
            it('should return invalid_input when isInvalidInput is true', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'idle',
                    lastError: null,
                    isInvalidInput: true,
                });

                expect(state).toBe('invalid_input');
            });

            it('should prioritize invalid_input over other states', () => {
                const state = deriveAgentState({
                    chatStatus: 'streaming',
                    changeSetStatus: 'building',
                    lastError: null,
                    isInvalidInput: true,
                });

                expect(state).toBe('invalid_input');
            });
        });

        describe('executing state', () => {
            it('should return executing when changeSetStatus is executing', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'executing',
                    lastError: null,
                });

                expect(state).toBe('executing');
            });

            it('should return executing even when chat is streaming', () => {
                const state = deriveAgentState({
                    chatStatus: 'streaming',
                    changeSetStatus: 'executing',
                    lastError: null,
                });

                expect(state).toBe('executing');
            });
        });

        describe('pending_approval state', () => {
            it('should return pending_approval when changeSetStatus is pending_approval', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'pending_approval',
                    lastError: null,
                });

                expect(state).toBe('pending_approval');
            });

            it('should return pending_approval even when chat is processing', () => {
                const state = deriveAgentState({
                    chatStatus: 'submitted',
                    changeSetStatus: 'pending_approval',
                    lastError: null,
                });

                expect(state).toBe('pending_approval');
            });
        });

        describe('done state', () => {
            it('should return done when changeSetStatus is approved', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'approved',
                    lastError: null,
                });

                expect(state).toBe('done');
            });
        });

        describe('fixing state', () => {
            it('should return fixing when building after a transient error', () => {
                const error: ExecutionError = {
                    type: 'TRANSIENT',
                    code: 'DB_LOCKED',
                    message: 'database is locked',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });

            it('should return fixing when building after a constraint error', () => {
                const error: ExecutionError = {
                    type: 'CONSTRAINT',
                    code: 'FOREIGN_KEY_VIOLATION',
                    message: 'FK constraint failed',
                };

                const state = deriveAgentState({
                    chatStatus: 'streaming',
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });

            it('should return fixing when building after a validation error', () => {
                const error: ExecutionError = {
                    type: 'VALIDATION',
                    code: 'NOT_NULL_VIOLATION',
                    message: 'NOT NULL constraint failed',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });

            it('should return fixing when building after NOT_FOUND error', () => {
                const error: ExecutionError = {
                    type: 'NOT_FOUND',
                    code: 'ENTITY_NOT_FOUND',
                    message: 'Entity not found',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });

            it('should return fixing when building after STALE_STATE error', () => {
                const error: ExecutionError = {
                    type: 'STALE_STATE',
                    code: 'OPTIMISTIC_LOCK_FAILURE',
                    message: 'Concurrent modification',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });

            it('should return fixing when execution_failed with recoverable error', () => {
                const error: ExecutionError = {
                    type: 'CONSTRAINT',
                    code: 'FOREIGN_KEY_VIOLATION',
                    message: 'FK constraint failed',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'execution_failed',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });

            it('should return fixing when execution_failed with transient error', () => {
                const error: ExecutionError = {
                    type: 'TRANSIENT',
                    code: 'DB_LOCKED',
                    message: 'database is locked',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'execution_failed',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });
        });

        describe('error state', () => {
            it('should return error when building after a critical error', () => {
                const error: ExecutionError = {
                    type: 'CRITICAL',
                    code: 'UNKNOWN_ERROR',
                    message: 'Something went wrong',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('error');
            });

            it('should return error when execution_failed with critical error', () => {
                const error: ExecutionError = {
                    type: 'CRITICAL',
                    code: 'UNKNOWN_ERROR',
                    message: 'Critical failure',
                };

                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'execution_failed',
                    lastError: error,
                });

                expect(state).toBe('error');
            });
        });

        describe('proposing state', () => {
            it('should return proposing when changeSetStatus is building without error', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'building',
                    lastError: null,
                });

                expect(state).toBe('proposing');
            });

            it('should return proposing when chat is streaming', () => {
                const state = deriveAgentState({
                    chatStatus: 'streaming',
                    changeSetStatus: 'idle',
                    lastError: null,
                });

                expect(state).toBe('proposing');
            });

            it('should return proposing when chat is submitted', () => {
                const state = deriveAgentState({
                    chatStatus: 'submitted',
                    changeSetStatus: 'idle',
                    lastError: null,
                });

                expect(state).toBe('proposing');
            });

            it('should return proposing when building and streaming', () => {
                const state = deriveAgentState({
                    chatStatus: 'streaming',
                    changeSetStatus: 'building',
                    lastError: null,
                });

                expect(state).toBe('proposing');
            });
        });

        describe('idle state', () => {
            it('should return idle when everything is ready and idle', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'idle',
                    lastError: null,
                });

                expect(state).toBe('idle');
            });

            it('should return idle when rejected', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'rejected',
                    lastError: null,
                });

                expect(state).toBe('idle');
            });
        });

        describe('state precedence', () => {
            it('should prioritize invalid_input over executing', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'executing',
                    lastError: null,
                    isInvalidInput: true,
                });

                expect(state).toBe('invalid_input');
            });

            it('should prioritize executing over pending_approval when status is executing', () => {
                // This shouldn't happen in practice, but tests the logic order
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'executing',
                    lastError: null,
                });

                expect(state).toBe('executing');
            });

            it('should prioritize fixing over proposing when there is a recoverable error', () => {
                const error: ExecutionError = {
                    type: 'VALIDATION',
                    code: 'NOT_NULL_VIOLATION',
                    message: 'NOT NULL constraint failed',
                };

                const state = deriveAgentState({
                    chatStatus: 'streaming', // Would normally be proposing
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('fixing');
            });

            it('should show error over fixing for critical errors', () => {
                const error: ExecutionError = {
                    type: 'CRITICAL',
                    code: 'UNKNOWN_ERROR',
                    message: 'Critical error',
                };

                const state = deriveAgentState({
                    chatStatus: 'streaming',
                    changeSetStatus: 'building',
                    lastError: error,
                });

                expect(state).toBe('error');
            });
        });

        describe('edge cases', () => {
            it('should handle null lastError correctly', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'building',
                    lastError: null,
                });

                expect(state).toBe('proposing');
            });

            it('should handle undefined isInvalidInput', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'idle',
                    lastError: null,
                    // isInvalidInput is undefined
                });

                expect(state).toBe('idle');
            });

            it('should handle error state for chat status', () => {
                const state = deriveAgentState({
                    chatStatus: 'error',
                    changeSetStatus: 'idle',
                    lastError: null,
                });

                // Chat error doesn't automatically mean agent error state
                // It just means not processing
                expect(state).toBe('idle');
            });

            it('should handle execution_failed without error details', () => {
                const state = deriveAgentState({
                    chatStatus: 'ready',
                    changeSetStatus: 'execution_failed',
                    lastError: null,
                });

                // Without error details, we assume it's being fixed
                expect(state).toBe('fixing');
            });
        });

        describe('all ChangeSetStatus combinations', () => {
            const statuses: ChangeSetStatus[] = [
                'idle',
                'building',
                'pending_approval',
                'executing',
                'approved',
                'execution_failed',
                'rejected',
            ];

            const chatStatuses: Array<'submitted' | 'streaming' | 'ready' | 'error'> = [
                'submitted',
                'streaming',
                'ready',
                'error',
            ];

            it('should return a valid AgentState for all combinations', () => {
                const validStates: AgentState[] = [
                    'idle',
                    'proposing',
                    'pending_approval',
                    'executing',
                    'fixing',
                    'error',
                    'done',
                    'invalid_input',
                ];

                statuses.forEach((changeSetStatus) => {
                    chatStatuses.forEach((chatStatus) => {
                        const state = deriveAgentState({
                            chatStatus,
                            changeSetStatus,
                            lastError: null,
                        });

                        expect(validStates).toContain(state);
                    });
                });
            });
        });
    });
});
