# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Manager is a TUI (Terminal User Interface) for managing multiple Claude Agent SDK instances. Built with React/Ink for the terminal UI and the `@anthropic-ai/claude-agent-sdk` for spawning and managing Claude agents.

## Commands

```bash
# Run the application
npm start

# Run in development mode with watch
npm run dev

# Run demo mode (mock data, no real agents)
npm run demo

# Run all tests
npm test

# Run tests once (no watch)
npm test run

# Run a specific test file
npx vitest src/utils/helpers.test.ts

# Run tests with coverage
npm run test:coverage
```

## Architecture

### Core Flow
1. `src/index.tsx` - Entry point, renders the `App` component
2. `src/components/App.tsx` - Main orchestrator: manages state via `useReducer`, handles agent lifecycle events, coordinates UI pages
3. `src/agent/manager.ts` - `AgentSDKManager` class wraps the Claude Agent SDK, uses EventEmitter pattern to emit events (output, idle, done, error, permissionRequest, questionRequest)
4. State flows through a reducer pattern (`src/state/reducer.ts`) with actions for agent CRUD, permissions, and output

### Key Directories
- `src/agent/` - Agent SDK management and system prompt templates
- `src/components/` - React/Ink UI components (stateless display + interactive prompts)
- `src/pages/` - Page-level views (ListViewPage, DetailViewPage, NewAgentPage, ArtifactDetailPage)
- `src/state/` - State management (reducer, history persistence)
- `src/git/` - Git worktree utilities for isolated agent work
- `src/types/` - TypeScript type definitions
- `src/utils/` - Helpers, logging, permissions, artifacts, image handling
- `src/demo/` - Demo mode with mock data for testing UI

### Agent Types
- `normal` - Standard agent, requires permission approval
- `auto-accept` - Auto-accepts edit tool permissions (Write, Edit, MultiEdit, NotebookEdit)
- `planning` - Planning mode agent

### Permission System
- Tools requiring permission: Write, Edit, MultiEdit, Bash, NotebookEdit, KillBash
- Permissions queue up if multiple requests come in while waiting
- `acceptEdits` mode auto-approves file edit operations

### Git Worktree Integration
When worktree mode is enabled:
1. App creates a worktree via `src/git/worktree.ts`
2. Agent receives worktree context in systemPrompt via `src/agent/systemPromptTemplates.ts`
3. Agent works in isolated directory
4. On completion, merge viability is tested and user can approve merge

### Artifacts System
Agents can read/write to `~/.agent-manager/artifacts/` directory. Operations on this path auto-allow without permission prompts.

## Testing

Tests use Vitest with:
- `ink-testing-library` for component tests
- Test files colocated with source: `*.test.ts` / `*.test.tsx`
- Coverage excludes `src/demo/` and `src/index.tsx`

## TypeScript

- Uses ESM modules (`"type": "module"`)
- JSX with `react-jsx` transform
- Runs via tsx loader: `node --import tsx`
