# Agent Manager - Source Structure

This directory contains the reorganized source code for the Agent Manager application.

## Directory Structure

```
src/
├── agent/           # Agent SDK management
│   └── manager.ts   # AgentSDKManager class - handles Claude Agent SDK lifecycle
│
├── components/      # React/Ink UI components
│   ├── App.tsx                 # Main application component with state management
│   ├── AgentItem.tsx           # Individual agent list item display
│   ├── DetailView.tsx          # Full agent detail view with output scrolling
│   ├── HelpBar.tsx             # Keyboard shortcut help display
│   ├── HistoryItem.tsx         # History list item display
│   ├── PermissionPrompt.tsx    # Permission request UI
│   ├── PromptInput.tsx         # Multi-step agent creation form
│   ├── StatusBadge.tsx         # Agent status indicator
│   └── Tab.tsx                 # Tab navigation component
│
├── git/             # Git worktree utilities
│   └── worktree.ts  # Functions for creating, merging, and cleaning up worktrees
│
├── state/           # State management
│   ├── history.ts   # Persistent history loading/saving
│   └── reducer.ts   # React reducer for application state
│
├── types/           # TypeScript type definitions
│   └── index.ts     # All shared types and interfaces
│
├── utils/           # Utility functions
│   ├── helpers.ts   # Time formatting, ID generation, etc.
│   └── logger.ts    # Debug logging to ~/.agent-manager/debug.log
│
└── index.tsx        # Application entry point
```

## Key Architectural Decisions

### Separation of Concerns
- **Agent Management** (`agent/`): Isolated SDK interaction logic
- **UI Components** (`components/`): Pure React/Ink components with minimal logic
- **State Management** (`state/`): Centralized state updates via reducer pattern
- **Git Operations** (`git/`): Self-contained git worktree functionality
- **Types** (`types/`): Single source of truth for TypeScript definitions

### Component Organization
Components are organized by functionality:
- **Display components**: StatusBadge, Tab, AgentItem, HistoryItem, HelpBar
- **Interactive components**: PermissionPrompt, PromptInput, DetailView
- **Container component**: App (manages state and orchestrates other components)

### State Management
Uses React's `useReducer` pattern with a centralized reducer for predictable state updates.

### Event-Driven Architecture
The `AgentSDKManager` extends `EventEmitter` to decouple agent lifecycle events from UI updates.

## Benefits of This Structure

1. **Maintainability**: Each file has a single, clear responsibility
2. **Testability**: Pure functions and isolated modules are easier to test
3. **Reusability**: Components and utilities can be imported independently
4. **Scalability**: Easy to add new features without affecting existing code
5. **Readability**: Clear file organization makes the codebase easy to navigate
