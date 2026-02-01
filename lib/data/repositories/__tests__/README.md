# ChangeSetRepository Tests

This directory contains unit tests for the `ChangeSetRepository` class, specifically focusing on the `applyChangeSet()` method which was fixed for BUG-011 (atomicity issue).

## Test Coverage

### Test File: `ChangeSetRepository.test.ts`

Comprehensive unit tests for the `applyChangeSet()` method covering:

#### 1. Happy Path Tests

**Scenario**: Changeset in 'pending_approval' state executes successfully

- ✅ Verifies changeset is fetched from database
- ✅ Verifies change requests are retrieved in correct order
- ✅ Verifies status updates to 'executing' before batch execution
- ✅ Verifies batch execution with correct SQL statements
- ✅ Verifies final status becomes 'approved' with timestamp
- ✅ Verifies temp IDs are replaced with real ULIDs
- ✅ Tests multiple operations (create, update, delete) in single changeset

#### 2. Validation Tests

**Scenario 1**: Changeset not in 'pending_approval' state

- ✅ Tests rejection when status is 'building'
- ✅ Tests rejection when status is 'approved'
- ✅ Tests rejection when status is 'rejected'
- ✅ Tests rejection when status is 'executing'
- ✅ Tests rejection when status is 'execution_failed'
- ✅ Verifies no database operations are attempted after validation failure

**Scenario 2**: Changeset not found

- ✅ Tests error handling when changeset ID doesn't exist
- ✅ Verifies appropriate error message

**Scenario 3**: No change requests

- ✅ Tests error when changeset has no change requests
- ✅ Tests error when change requests are null
- ✅ Verifies informative error message about database persistence

#### 3. Failure Path Tests

**Scenario**: Batch execution fails

- ✅ Verifies status transitions to 'executing' before batch
- ✅ Verifies status becomes 'execution_failed' when batch fails (NOT stuck in 'pending_approval')
- ✅ Tests error propagation
- ✅ Tests reviewed_at timestamp is set on failure
- ✅ Tests graceful handling when status update to 'execution_failed' also fails
- ✅ Verifies changeset remains in 'executing' state (recoverable) if final update fails

#### 4. Intermediate State Tests

**Scenario**: Status transitions during execution

- ✅ Verifies status is set to 'executing' BEFORE batch execution begins
- ✅ Tests complete state transition sequence: pending_approval → executing → approved
- ✅ Verifies execution order is maintained

#### 5. Edge Cases and Operation Types

**Create Operations**:
- ✅ Verifies temp IDs (starting with 'temp-') are replaced with ULIDs
- ✅ Tests INSERT statement generation
- ✅ Verifies table name mapping

**Update Operations**:
- ✅ Verifies UPDATE statement generation
- ✅ Tests field exclusion (id should not be in SET clause)
- ✅ Verifies WHERE clause uses entity_id

**Delete Operations**:
- ✅ Verifies soft delete (sets deleted_at timestamp)
- ✅ Tests UPDATE statement for soft delete
- ✅ Verifies timestamp format

## Running the Tests

### Install Dependencies

```bash
npm install
```

This will install:
- `jest` - Test framework
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript type definitions
- `@testing-library/jest-dom` - Custom matchers

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Run Specific Test File

```bash
npm test ChangeSetRepository.test.ts
```

### Run Specific Test Suite

```bash
npm test -- --testNamePattern="Happy path"
```

## Test Architecture

### Mocking Strategy

The tests use Jest mocks to isolate the `ChangeSetRepository` from its dependencies:

1. **Database Connection**: Mock `SQLiteDBConnection` from `@capacitor-community/sqlite`
2. **ULID Generation**: Mock `ulid()` to return predictable IDs
3. **Method Mocks**: Mock `query()`, `run()`, and `executeSet()` methods

### AAA Pattern

All tests follow the Arrange-Act-Assert pattern:

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const mockData = { ... };
  mockDb.query.mockResolvedValue({ ... });

  // Act - Execute the method under test
  await repository.applyChangeSet(changesetId);

  // Assert - Verify expected behavior
  expect(mockDb.executeSet).toHaveBeenCalledWith(...);
});
```

### Test Isolation

- Each test has fresh mocks via `beforeEach()`
- No shared state between tests
- Tests can run in any order
- Tests can run in parallel

## BUG-011 Fix Verification

These tests specifically verify the fix for BUG-011 (atomicity issue):

### Problem (Before Fix)
- If batch execution failed, changeset could remain stuck in 'pending_approval' state
- No way to distinguish between pending changesets and failed ones

### Solution (After Fix)
- Status transitions to 'executing' BEFORE batch execution
- If batch fails, status becomes 'execution_failed'
- Changeset is never orphaned in 'pending_approval'

### Test Coverage for Fix

1. **Intermediate State Test**: Verifies 'executing' state is set before batch
2. **Failure Path Test**: Verifies status becomes 'execution_failed' on batch failure
3. **Stuck Prevention Test**: Explicitly tests changeset is NOT in 'pending_approval' after failure

## Coverage Goals

Target coverage: 80%+

Current coverage areas:
- ✅ All validation paths
- ✅ All operation types (create, update, delete)
- ✅ All state transitions
- ✅ Error handling paths
- ✅ Edge cases (temp IDs, null data, multiple operations)

## Maintenance

When modifying `applyChangeSet()`:

1. Update relevant tests
2. Add new tests for new behaviors
3. Ensure all tests pass
4. Check coverage remains above 80%
5. Update this README if test structure changes

## Related Files

- Implementation: `/lib/data/repositories/ChangeSetRepository.ts`
- Types: `/lib/data/types.ts`
- Base Repository: `/lib/data/repositories/BaseRepository.ts`
- Jest Config: `/jest.config.js`
- Test Setup: `/jest.setup.ts`
