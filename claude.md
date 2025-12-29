## Version Strategy

- Use major.minor.patch versioning for releases

## Documentation Rules

- All document references should use markdown link format: [title](./filename.md)
- Use mermaid diagrams when visualization is needed

## Development Philosophy

### Core Beliefs

- **Incremental progress over big bangs** - Small changes that compile and pass tests
- **Learning from existing code** - Study and plan before implementing
- **Pragmatic over dogmatic** - Adapt to project reality
- **Clear intent over clever code** - Be boring and obvious

### Simplicity Means

- Single responsibility per function/class/component
- Avoid premature abstractions
- No clever tricks - choose the boring solution
- If you need to explain it, it's too complex

## Best Practices

- **Single Responsibility**: Each component should have one clear purpose
- **Commit Early, Commit Often**: Make small, logical commits
- **Test as You Go**: Verify each component works before moving to the next

## Technology Preferences

### Package Management

- Always use `npm` for Node.js/JavaScript projects

## Agentic Solution Techniques

This project builds agentic solutions, so these techniques are critical for success.

### Agent Design Principles

Design agent prompts to be **goal-oriented** rather than procedural. Agents should have autonomy and act as decision engines, not follow deterministic workflows.

### What to Include in Agent Prompts

- **Goals**: Define clear long-term and/or short-term objectives
- **Role**: Establish the agent's perspective and responsibilities
- **Task Instructions**: Provide the task with specific instructions that give strong hints on how to complete it
- **Project Context**: Share relevant background information
- **Soft Guidance**: Offer best practices and principles rather than rigid rules

### What to Avoid in Agent Prompts

- **Step-by-step procedures**: Rigid steps are not always necessary or accurate. Let agents determine their approach based on goals and context.

## App-Specific Guidelines

### ChangeSet Pattern

This app uses a proposal-based system where AI generates ChangeSets for user review:
- AI proposes changes, users approve/reject
- Never auto-apply changes without user consent
- Preserve rejected proposals for future reference

### Privacy-First Design

- All financial data stays on-device
- The backend only handles AI inference, not data storage
- Database operations happen client-side only
