/**
 * System prompt for the AI financial transaction assistant
 * This prompt defines the agent's role, behavior, and key concepts
 */
export const SYSTEM_PROMPT = `You are a financial transaction assistant for OurPot, a household expense tracker.

Your role:
- Help users add, modify, and categorize expenses and deposits
- Propose changes using the changeset tools provided
- ALWAYS use confirmChangeSet() after composing changes
- Handle user approval/rejection feedback gracefully

Key behaviors:
1. **Amounts**: Users speak in currency (£42.50), you provide amounts as decimals (42.50). The system automatically converts to pence (4250) for storage.

2. **Keyed Buffer (Upsert)**: When proposing changes:
   - Each change request has a unique key: "entityType:entityId"
   - Re-proposing with the same entityId UPDATES the previous proposal (upsert semantics)
   - To remove a proposal, use action: "DISCARD"
   - You can correct errors by simply re-proposing with fixed values

3. **Approval Workflow**:
   - You PROPOSE changes, the user APPROVES them
   - After accumulating change requests, call confirmChangeSet()
   - Never assume approval - always wait for explicit confirmation
   - If rejected with feedback, correct specific errors and re-submit
   - If rejected completely, start fresh with a different approach

4. **Entity IDs**:
   - Always confirm entity IDs when updating/deleting
   - Use searchTransactions() to find transaction IDs
   - Use getCategories() to find category IDs
   - Use getMembers() to find member IDs

Available data:
- Categories: Use getCategories() to see available options
- Members: Use getMembers() to see who can pay
- Transactions: Use searchTransactions() to find existing records

Important rules:
- Category is REQUIRED for EXPENSE transactions, optional for DEPOSIT
- Transaction dates cannot be in the future
- Amounts must be positive with max 2 decimal places
- When uncertain, ask clarifying questions before proposing

Iterative Refinement:
When user rejects with feedback (e.g., "Change amount to £45"):
1. Update the specific change request using the same entityId (upsert)
2. Call confirmChangeSet() again to re-submit
3. User will review the corrected version

When user rejects completely:
1. Clear your understanding and start fresh
2. Ask what they'd like instead
3. Propose a new approach

Remember: You are a changeset-focused assistant. Your primary job is to help users safely modify their financial data through the propose-review-approve workflow.`;

/**
 * Initial greeting message for the AI agent
 */
export const INITIAL_MESSAGE = "I'll help you manage your household expenses. What would you like to do?";

/**
 * Build context message after user decision
 */
export function buildContextAfterDecision(decision: {
  status: "approved" | "rejected_with_feedback" | "rejected_completely";
  feedback?: string;
  results?: { summary: string };
}): string {
  if (decision.status === "approved") {
    return `Changes approved and applied successfully. ${decision.results?.summary || "All operations completed."}`;
  } else if (decision.status === "rejected_with_feedback") {
    return `User feedback: "${decision.feedback}". Please revise the changeset and re-submit after making corrections.`;
  } else {
    return `Changes rejected completely. The user wants a different approach. Ask what they'd like instead.`;
  }
}

import { getRecoverySuggestion, isTransientError, isRecoverableError } from './errorClassification';
import type { ExecutionError } from './types';

/**
 * SECURITY: Sanitize error messages to prevent internal schema disclosure
 * Removes SQL-specific details while preserving actionable information
 */
function sanitizeErrorMessage(message: string): string {
  // Remove table/column names from constraint messages
  return message
    .replace(/constraint failed[:\s]*\w+\.\w+/gi, 'constraint failed')
    .replace(/table[:\s]*["'`]?\w+["'`]?/gi, 'table')
    .replace(/column[:\s]*["'`]?\w+["'`]?/gi, 'column')
    .replace(/SQLITE_\w+/g, 'database error');
}

/**
 * Build error context message for AI to analyze and fix
 * BUG-012: Enhanced to use classified ExecutionError with recovery strategies
 * SECURITY: Sanitizes messages to prevent internal schema disclosure
 */
export function buildErrorContext(error: ExecutionError): string {
  const recoverySuggestion = getRecoverySuggestion(error);
  const canRetry = isTransientError(error);
  const canFix = isRecoverableError(error);

  // SECURITY: Sanitize the error message before exposing to AI
  const sanitizedMessage = sanitizeErrorMessage(error.message);

  // Only include non-sensitive context details
  const details = error.details || {};
  const detailLines: string[] = [];
  if (details.entityType) detailLines.push(`Entity type: ${details.entityType}`);
  // Note: entityId and other internal details are intentionally omitted for security

  return `Execution failed: ${sanitizedMessage}

Error type: ${error.type}
Error code: ${error.code}
${detailLines.length > 0 ? detailLines.join('\n') : ""}

Recovery strategy: ${recoverySuggestion}

${canRetry ? "This is a TRANSIENT error - you can retry the same changeset without modifications." : ""}
${canFix ? "This error can be fixed by modifying the changeset. Analyze the issue and correct the specific problem." : ""}
${!canRetry && !canFix ? "This is a CRITICAL error - ask the user how they would like to proceed." : ""}

After fixing, call confirmChangeSet() again. The user will need to re-approve the corrected version.`;
}
