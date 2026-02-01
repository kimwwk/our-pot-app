import { ChangeSetRepository } from '../ChangeSetRepository';
import { ChangeSet, ChangeRequest } from '../../types';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';

// Mock ulid to return predictable IDs
jest.mock('ulid', () => ({
  ulid: jest.fn(() => 'test-ulid-12345'),
}));

describe('ChangeSetRepository.applyChangeSet', () => {
  let repository: ChangeSetRepository;
  let mockDb: jest.Mocked<SQLiteDBConnection>;

  beforeEach(() => {
    // Create mock database connection
    mockDb = {
      query: jest.fn(),
      run: jest.fn(),
      executeSet: jest.fn(),
    } as any;

    repository = new ChangeSetRepository(mockDb);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Happy path', () => {
    it('should successfully apply changeset in pending_approval state and update status to approved', async () => {
      // Arrange
      const changesetId = 'changeset-123';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        title: 'Test Changeset',
        description: 'Test description',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'transaction',
          entity_id: 'temp-tx-1',
          current_data: null,
          proposed_data: JSON.stringify({
            id: 'temp-tx-1',
            account_id: 'acc-1',
            member_id: 'mem-1',
            type: 'EXPENSE',
            amount: 5000,
            description: 'Test transaction',
            date: '2026-01-31',
            status: 'completed',
          }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      // Mock getById to return the changeset
      mockDb.query.mockResolvedValueOnce({
        values: [mockChangeset],
      } as any);

      // Mock getRequests to return the change requests
      mockDb.query.mockResolvedValueOnce({
        values: mockRequests,
      } as any);

      // Mock executeNonQuery for status update to 'executing'
      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);

      // Mock executeSet for batch execution
      mockDb.executeSet.mockResolvedValueOnce({ changes: { changes: 2 } } as any);

      // Act
      await repository.applyChangeSet(changesetId);

      // Assert
      // 1. Verify changeset was fetched
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM changesets WHERE id = ?',
        [changesetId]
      );

      // 2. Verify change requests were fetched
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM change_requests WHERE changeset_id = ? ORDER BY execution_order ASC',
        [changesetId]
      );

      // 3. Verify status was updated to 'executing' before batch execution
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE changesets SET status = \'executing\' WHERE id = ?',
        [changesetId]
      );

      // 4. Verify executeSet was called with correct statements
      expect(mockDb.executeSet).toHaveBeenCalledTimes(1);
      const batchStatements = mockDb.executeSet.mock.calls[0][0];

      // Should have 2 statements: 1 for transaction insert, 1 for status update
      expect(batchStatements).toHaveLength(2);

      // Verify transaction insert statement
      expect(batchStatements[0].statement).toContain('INSERT INTO transactions');
      expect(batchStatements[0].values).toContain('test-ulid-12345'); // Replaced temp ID

      // Verify final status update to 'approved'
      expect(batchStatements[1].statement).toBe(
        'UPDATE changesets SET status = \'approved\', reviewed_at = ? WHERE id = ?'
      );
      expect(batchStatements[1].values[1]).toBe(changesetId);
    });

    it('should handle multiple change requests in correct execution order', async () => {
      // Arrange
      const changesetId = 'changeset-multi';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'category',
          proposed_data: JSON.stringify({ id: 'cat-1', account_id: 'acc-1', name: 'Food' }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
        {
          id: 'req-2',
          changeset_id: changesetId,
          operation_type: 'update',
          entity_type: 'transaction',
          entity_id: 'tx-1',
          proposed_data: JSON.stringify({ id: 'tx-1', category_id: 'cat-1', amount: 3000 }),
          execution_order: 2,
          created_at: '2026-01-31T10:00:00Z',
        },
        {
          id: 'req-3',
          changeset_id: changesetId,
          operation_type: 'delete',
          entity_type: 'member',
          entity_id: 'mem-old',
          execution_order: 3,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);
      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);
      mockDb.executeSet.mockResolvedValueOnce({ changes: { changes: 4 } } as any);

      // Act
      await repository.applyChangeSet(changesetId);

      // Assert
      const batchStatements = mockDb.executeSet.mock.calls[0][0];

      // Should have 4 statements: 3 operations + 1 status update
      expect(batchStatements).toHaveLength(4);

      // Verify create operation
      expect(batchStatements[0].statement).toContain('INSERT INTO categories');

      // Verify update operation
      expect(batchStatements[1].statement).toContain('UPDATE transactions');
      expect(batchStatements[1].values).toContain('tx-1');

      // Verify delete operation (soft delete)
      expect(batchStatements[2].statement).toContain('UPDATE members SET deleted_at = ?');
      expect(batchStatements[2].values[1]).toBe('mem-old');
    });
  });

  describe('Validation: changeset not in pending_approval state', () => {
    const statuses = ['building', 'approved', 'rejected', 'executing', 'execution_failed'];

    statuses.forEach((status) => {
      it(`should throw error when changeset is in '${status}' state`, async () => {
        // Arrange
        const changesetId = `changeset-${status}`;
        const mockChangeset: ChangeSet = {
          id: changesetId,
          status: status as any,
          source: 'ai',
          proposed_at: '2026-01-31T10:00:00Z',
        };

        mockDb.query.mockResolvedValueOnce({
          values: [mockChangeset],
        } as any);

        // Act - BUG-012: Now returns { success: false, error } instead of throwing
        const result = await repository.applyChangeSet(changesetId);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain(`Changeset ${changesetId} is in '${status}' state`);
        }

        // Verify no further operations were attempted
        expect(mockDb.run).not.toHaveBeenCalled();
        expect(mockDb.executeSet).not.toHaveBeenCalled();
      });
    });
  });

  describe('Validation: changeset not found', () => {
    it('should return error when changeset does not exist', async () => {
      // Arrange
      const changesetId = 'non-existent-changeset';

      // Mock getById to return null (no changeset found)
      mockDb.query.mockResolvedValueOnce({
        values: [],
      } as any);

      // Act - BUG-012: Now returns { success: false, error } instead of throwing
      const result = await repository.applyChangeSet(changesetId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(`Changeset ${changesetId} not found`);
      }

      // Verify no further operations were attempted
      expect(mockDb.run).not.toHaveBeenCalled();
      expect(mockDb.executeSet).not.toHaveBeenCalled();
    });
  });

  describe('Validation: no change requests', () => {
    it('should return error when changeset has no change requests', async () => {
      // Arrange
      const changesetId = 'empty-changeset';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      // Mock getById to return changeset
      mockDb.query.mockResolvedValueOnce({
        values: [mockChangeset],
      } as any);

      // Mock getRequests to return empty array
      mockDb.query.mockResolvedValueOnce({
        values: [],
      } as any);

      // Act - BUG-012: Now returns { success: false, error } instead of throwing
      const result = await repository.applyChangeSet(changesetId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(`No change requests found for changeset ${changesetId}`);
      }

      // Verify no operations were attempted
      expect(mockDb.run).not.toHaveBeenCalled();
      expect(mockDb.executeSet).not.toHaveBeenCalled();
    });

    it('should return error when changeset has null change requests', async () => {
      // Arrange
      const changesetId = 'null-requests-changeset';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: null } as any);

      // Act - BUG-012: Now returns { success: false, error } instead of throwing
      const result = await repository.applyChangeSet(changesetId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(`No change requests found for changeset ${changesetId}`);
      }
    });
  });

  describe('Failure path: batch execution fails', () => {
    it('should update status to execution_failed when batch execution throws error', async () => {
      // Arrange
      const changesetId = 'failing-changeset';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'transaction',
          proposed_data: JSON.stringify({ id: 'tx-1', amount: 1000 }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      // Mock status update to 'executing' succeeds
      mockDb.run
        .mockResolvedValueOnce({ changes: { changes: 1 } } as any);

      // Mock executeSet to throw error (batch execution fails)
      const batchError = new Error('Foreign key constraint violation');
      mockDb.executeSet.mockRejectedValueOnce(batchError);

      // Mock status update to 'execution_failed' succeeds
      mockDb.run
        .mockResolvedValueOnce({ changes: { changes: 1 } } as any);

      // Act - BUG-012: Now returns { success: false, error } instead of throwing
      const result = await repository.applyChangeSet(changesetId);

      // Assert - Should return failure with classified error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Foreign key constraint violation');
        expect(result.error.type).toBe('CONSTRAINT');
        expect(result.error.code).toBe('FOREIGN_KEY_VIOLATION');
      }

      // Verify status was updated to 'executing' before batch
      expect(mockDb.run).toHaveBeenNthCalledWith(1,
        'UPDATE changesets SET status = \'executing\' WHERE id = ?',
        [changesetId]
      );

      // Verify executeSet was attempted
      expect(mockDb.executeSet).toHaveBeenCalledTimes(1);

      // Verify status was updated to 'execution_failed' after error
      expect(mockDb.run).toHaveBeenNthCalledWith(2,
        'UPDATE changesets SET status = \'execution_failed\', reviewed_at = ? WHERE id = ?',
        expect.arrayContaining([expect.any(String), changesetId])
      );

      // Verify reviewed_at timestamp is recent
      const reviewedAt = mockDb.run.mock.calls[1][1][0];
      expect(new Date(reviewedAt).getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it('should not be stuck in pending_approval when batch fails', async () => {
      // Arrange
      const changesetId = 'stuck-prevention-test';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'transaction',
          proposed_data: JSON.stringify({ id: 'tx-1' }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);
      mockDb.executeSet.mockRejectedValueOnce(new Error('Batch failed'));
      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);

      // Act - BUG-012: Now returns { success: false, error } instead of throwing
      const result = await repository.applyChangeSet(changesetId);

      // Assert - Should return failure
      expect(result.success).toBe(false);

      // Assert - Verify changeset transitioned through states correctly
      // First update: pending_approval -> executing
      expect(mockDb.run.mock.calls[0][0]).toContain('status = \'executing\'');

      // Second update: executing -> execution_failed (NOT stuck in pending_approval)
      expect(mockDb.run.mock.calls[1][0]).toContain('status = \'execution_failed\'');
    });

    it('should handle failure to update status to execution_failed gracefully', async () => {
      // Arrange
      const changesetId = 'double-fail-changeset';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'transaction',
          proposed_data: JSON.stringify({ id: 'tx-1' }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      // Status update to 'executing' succeeds
      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);

      // Batch execution fails
      const batchError = new Error('Batch execution failed');
      mockDb.executeSet.mockRejectedValueOnce(batchError);

      // Status update to 'execution_failed' also fails
      const statusUpdateError = new Error('Database connection lost');
      mockDb.run.mockRejectedValueOnce(statusUpdateError);

      // Act - BUG-012: Now returns { success: false, error } instead of throwing
      const result = await repository.applyChangeSet(changesetId);

      // Assert - Should return failure with the original batch error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Batch execution failed');
      }

      // Verify both updates were attempted
      expect(mockDb.run).toHaveBeenCalledTimes(2);

      // Changeset remains in 'executing' state, which is recoverable
      // (not stuck in 'pending_approval')
    });
  });

  describe('Intermediate state: status transitions', () => {
    it('should set status to executing before batch execution', async () => {
      // Arrange
      const changesetId = 'state-transition-test';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'transaction',
          proposed_data: JSON.stringify({ id: 'tx-1', amount: 1000 }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      let executeSetCalled = false;
      let statusWasExecutingBeforeBatch = false;

      // Mock executeNonQuery to track when 'executing' status is set
      mockDb.run.mockImplementation(async (statement: string, values?: any[]) => {
        if (statement.includes('status = \'executing\'')) {
          statusWasExecutingBeforeBatch = !executeSetCalled;
        }
        return { changes: { changes: 1 } } as any;
      });

      // Mock executeSet to track when batch execution happens
      mockDb.executeSet.mockImplementation(async () => {
        executeSetCalled = true;
        return { changes: { changes: 2 } } as any;
      });

      // Act
      await repository.applyChangeSet(changesetId);

      // Assert
      expect(statusWasExecutingBeforeBatch).toBe(true);
      expect(executeSetCalled).toBe(true);
    });

    it('should follow state transition sequence: pending_approval -> executing -> approved', async () => {
      // Arrange
      const changesetId = 'full-flow-test';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'transaction',
          proposed_data: JSON.stringify({ id: 'tx-1', amount: 1000 }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);
      mockDb.executeSet.mockResolvedValueOnce({ changes: { changes: 2 } } as any);

      // Act
      await repository.applyChangeSet(changesetId);

      // Assert - Verify complete state transition
      // Step 1: Validate initial state (pending_approval) - done via getById
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM changesets WHERE id = ?',
        [changesetId]
      );

      // Step 2: Transition to executing
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE changesets SET status = \'executing\' WHERE id = ?',
        [changesetId]
      );

      // Step 3: Execute batch (includes final transition to approved)
      const batchStatements = mockDb.executeSet.mock.calls[0][0];
      const finalStatusUpdate = batchStatements[batchStatements.length - 1];
      expect(finalStatusUpdate.statement).toContain('status = \'approved\'');
    });
  });

  describe('Edge cases and operation types', () => {
    it('should replace temp IDs with ULIDs for create operations', async () => {
      // Arrange
      const changesetId = 'temp-id-test';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'create',
          entity_type: 'transaction',
          proposed_data: JSON.stringify({
            id: 'temp-tx-123',
            amount: 5000,
            description: 'Test',
          }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);
      mockDb.executeSet.mockResolvedValueOnce({ changes: { changes: 2 } } as any);

      // Act
      await repository.applyChangeSet(changesetId);

      // Assert
      const batchStatements = mockDb.executeSet.mock.calls[0][0];
      const insertStatement = batchStatements[0];

      // Should use generated ULID instead of temp ID
      expect(insertStatement.values).toContain('test-ulid-12345');
      expect(insertStatement.values).not.toContain('temp-tx-123');
    });

    it('should handle update operations correctly', async () => {
      // Arrange
      const changesetId = 'update-test';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'update',
          entity_type: 'transaction',
          entity_id: 'tx-existing',
          proposed_data: JSON.stringify({
            id: 'tx-existing',
            amount: 7500,
            description: 'Updated description',
          }),
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);
      mockDb.executeSet.mockResolvedValueOnce({ changes: { changes: 2 } } as any);

      // Act
      await repository.applyChangeSet(changesetId);

      // Assert
      const batchStatements = mockDb.executeSet.mock.calls[0][0];
      const updateStatement = batchStatements[0];

      expect(updateStatement.statement).toContain('UPDATE transactions');
      expect(updateStatement.statement).toContain('WHERE id = ?');
      expect(updateStatement.values).toContain(7500);
      expect(updateStatement.values).toContain('Updated description');
      expect(updateStatement.values[updateStatement.values.length - 1]).toBe('tx-existing');
    });

    it('should handle soft delete operations correctly', async () => {
      // Arrange
      const changesetId = 'delete-test';
      const mockChangeset: ChangeSet = {
        id: changesetId,
        status: 'pending_approval',
        source: 'ai',
        proposed_at: '2026-01-31T10:00:00Z',
      };

      const mockRequests: ChangeRequest[] = [
        {
          id: 'req-1',
          changeset_id: changesetId,
          operation_type: 'delete',
          entity_type: 'member',
          entity_id: 'mem-delete',
          execution_order: 1,
          created_at: '2026-01-31T10:00:00Z',
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ values: [mockChangeset] } as any)
        .mockResolvedValueOnce({ values: mockRequests } as any);

      mockDb.run.mockResolvedValueOnce({ changes: { changes: 1 } } as any);
      mockDb.executeSet.mockResolvedValueOnce({ changes: { changes: 2 } } as any);

      // Act
      await repository.applyChangeSet(changesetId);

      // Assert
      const batchStatements = mockDb.executeSet.mock.calls[0][0];
      const deleteStatement = batchStatements[0];

      expect(deleteStatement.statement).toBe(
        'UPDATE members SET deleted_at = ? WHERE id = ?'
      );
      expect(deleteStatement.values[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
      expect(deleteStatement.values[1]).toBe('mem-delete');
    });
  });
});
