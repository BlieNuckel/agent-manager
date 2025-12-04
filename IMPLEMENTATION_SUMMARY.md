# Worktree Management Implementation Summary

## Overview
Successfully migrated from external worktree management to agent-driven worktree management using Claude Agent SDK's `systemPrompt` feature.

## Key Changes

### 1. New systemPrompt Template System
**File:** `src/agent/systemPromptTemplates.ts` (NEW)

- Created `WorktreeContext` interface to pass repository context
- Implemented `buildWorktreeInstructions()` that generates detailed instructions for agents
- Instructions tell agents to:
  - Create git worktrees as their first action
  - Work within isolated worktree directories
  - Test merge viability before completion
  - Signal merge readiness with special markers

### 2. AgentSDKManager Updates
**File:** `src/agent/manager.ts`

- Added `worktreeContext?: WorktreeContext` parameter to `spawn()` method
- Integrated systemPrompt injection when worktree context is provided
- Uses `systemPrompt.append` with `preset: 'claude_code'` to preserve Claude Code behavior
- Conditionally builds and injects systemPrompt only when worktrees are enabled

### 3. Git Utilities Refactoring
**File:** `src/git/worktree.ts`

- **Removed:** `createWorktreeWithAgent()` - agents now create their own worktrees
- **Removed:** `attemptAutoMergeWithAgent()` - agents test merges themselves
- **Kept:** `getGitRoot()`, `getCurrentBranch()` - still needed for context
- **Added:** `getRepoName()` - extract repo name from git root
- **Exposed:** `generateWorktreeName()` - now public for suggested branch names

### 4. Type System Simplification
**File:** `src/types/index.ts`

- **Removed:** `MergeConfirmation` interface (no longer needed)
- **Removed:** Agent properties:
  - `pendingMergeConfirmation`
  - `mergeStatus`
  - `mergeError`
- **Removed:** Action type:
  - `SET_MERGE_CONFIRMATION`
- Kept `worktreeName` for display purposes

### 5. State Reducer Updates
**File:** `src/state/reducer.ts`

- Removed `SET_MERGE_CONFIRMATION` action handler
- Simplified state management by removing merge-related logic

### 6. App Component Refactoring
**File:** `src/components/App.tsx`

- **Removed:** External worktree creation logic
- **Removed:** Merge checking and confirmation flow
- **Removed:** `handleMergeConfirmationResponse()` handler
- **Added:** Worktree context building when enabled
- **Simplified:** `createAgent()` now just passes context to AgentSDKManager
- Agents spawn with injected systemPrompt containing worktree instructions

### 7. UI Component Updates
**Files:** `src/components/DetailView.tsx`, `src/components/AgentItem.tsx`

- Removed merge status displays
- Removed merge confirmation prompt integration
- Removed `MergeConfirmationPrompt` component entirely
- Simplified UI to show only permission prompts
- Kept worktree name display for context

### 8. PromptInput Component
**File:** `src/components/PromptInput.tsx`

- No changes required - already collecting worktree preferences correctly
- Still prompts for worktree name (optional)
- Still shows worktree creation step in wizard

## How It Works Now

### User Flow
1. User creates a new agent and opts for worktree mode
2. User optionally provides a branch name (or auto-generated from prompt)
3. Agent receives systemPrompt with detailed worktree instructions

### Agent Behavior
1. Agent reads systemPrompt instructions
2. Agent creates git worktree as first action
3. Agent works within isolated worktree directory
4. Agent makes commits as needed
5. Agent tests merge viability at completion
6. Agent signals merge readiness with markers like:
   - `[WORKTREE_MERGE_READY] branch-name`
   - `[WORKTREE_MERGE_CONFLICTS] branch-name`

### Benefits
- **Agents have full control** over worktree lifecycle
- **Less complex state management** in the UI
- **Better agent autonomy** - agents handle their own isolation
- **Leverages Claude's intelligence** - agents decide when/how to merge
- **Follows SDK patterns** - uses systemPrompt as intended

## Testing Status
✅ TypeScript compilation passes with no errors
✅ All imports resolved correctly
✅ Unused components removed
✅ Type system consistent across all files

## Migration Notes
- Old worktree management code completely removed
- No backward compatibility needed (fresh implementation)
- Agent behavior now driven by systemPrompt instructions
- UI simplified to only show worktree name as indicator
