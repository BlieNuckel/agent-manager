# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Manager is a Terminal User Interface (TUI) application for managing multiple Claude Agent SDK instances. It allows users to spawn, monitor, and manage multiple concurrent agents, with support for git worktree integration for isolated development environments.

## Development Commands

### Running the Application
```bash
npm start              # Run the application
npm run dev            # Run in watch mode (auto-reloads on changes)
```

### Running with tsx directly
```bash
node --import tsx src/index.tsx           # Run once
node --import tsx --watch src/index.tsx   # Run in watch mode
```

## Architecture

### Core Components

**AgentSDKManager** (`src/agent/manager.ts`)
- Extends EventEmitter for agent lifecycle events
- Manages Claude Agent SDK query instances with AbortControllers
- Handles permission requests with custom `canUseTool` logic
- Auto-allows read-only tools (Read, Glob, Grep, WebSearch, etc.)
- Requires explicit permission for write tools (Write, Edit, Bash, etc.)
- Supports per-agent auto-accept mode for permissions
- Generates agent titles asynchronously using Claude Code CLI

**State Management** (`src/state/reducer.ts`)
- Uses React's `useReducer` pattern with a centralized reducer
- All state updates flow through typed Action dispatches
- Immutable state updates for predictable UI rendering

**Git Worktree Integration** (`src/git/worktree.ts`)
- Creates isolated git worktrees for agent tasks
- Auto-generates branch names from task descriptions (kebab-case, 2-4 words)
- Tests merge viability before attempting auto-merge
- Prompts user for confirmation before merging clean branches
- Detects conflicts and reports them without attempting merge

**UI Components** (`src/components/`)
- Built with Ink (React for CLIs)
- App.tsx: Main container with state management
- DetailView.tsx: Full agent view with scrollable output
- PromptInput.tsx: Multi-step agent creation wizard
- PermissionPrompt.tsx: Interactive permission approval
- MergeConfirmationPrompt.tsx: Merge confirmation UI

### Event-Driven Architecture

The AgentSDKManager emits events that the UI listens to:
- `output`: New output line from agent
- `done`: Agent completed (exit code)
- `error`: Agent error occurred
- `sessionId`: SDK session initialized
- `permissionRequest`: Agent needs tool permission
- `titleUpdate`: Generated title available

### Permission System

Two tool categories:
1. **Auto-allowed** (read-only): Read, Glob, Grep, WebSearch, WebFetch, Task, TodoRead, TodoWrite
2. **Permission required** (write): Write, Edit, MultiEdit, Bash, NotebookEdit, KillBash

Three permission modes:
- `normal`: Prompt for each write operation
- `planning`: Same as normal but used for planning agents
- `auto-accept`: Automatically allow all write operations

Users can toggle "Always Allow" during a permission prompt to enable auto-accept for that agent.

### Title Generation

Agents are created with "Pending..." title. The manager asynchronously calls the Claude Code CLI to generate descriptive 3-8 word titles using the Haiku model. Once generated, titles are updated in both the active agent list and history.

### History Persistence

Recent prompts are saved to `~/.agent-manager/history.json` (last 5 entries). History entries track: id, title, prompt, date, and workDir.

## Key Technical Details

### TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx (for Ink components)
- Strict mode enabled

### Dependencies
- `@anthropic-ai/claude-agent-sdk`: Core agent functionality
- `ink`: React renderer for CLI applications
- `tsx`: TypeScript execution for Node.js
- React ecosystem (react, react-reconciler)

### Data Storage
- History: `~/.agent-manager/history.json`
- Debug logs: `~/.agent-manager/debug.log`

## Architectural Patterns

### Separation of Concerns
Each directory has a clear responsibility:
- `agent/`: SDK lifecycle management (spawn, kill, permission handling)
- `components/`: Pure React/Ink UI components
- `state/`: State management (reducer, history persistence)
- `git/`: Git worktree operations
- `types/`: TypeScript type definitions
- `utils/`: Helper functions (formatting, logging, title generation)

### Component Communication
- AgentSDKManager → App: Events (output, done, error, etc.)
- App → AgentSDKManager: Method calls (spawn, kill, setAutoAccept)
- App → Components: Props with callbacks
- Components → App: Callback invocations

### Async Operations
- Agent spawning is async (worktree creation + SDK spawn)
- Title generation happens in background, updates via event
- Merge operations are async with confirmation flow

## Git Worktree Workflow

1. User creates agent with worktree enabled
2. System creates `<repo-name>-<branch-name>` directory alongside main repo
3. Agent runs in isolated worktree directory
4. On completion, system tests merge with `--no-commit --no-ff`
5. If clean, prompts user for confirmation
6. On confirmation, merges, removes worktree, deletes branch
7. If conflicts, reports files and requires manual resolution

## Slash Commands

The system supports Claude Agent SDK slash commands via `.claude/prompts/`. The `worktree-agent.md` prompt provides specialized instructions for git worktree management.
