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
│   ├── HelpBar.tsx             # Keyboard shortcut help display
│   ├── HistoryItem.tsx         # History list item display
│   ├── Layout.tsx              # Main layout with header and help bar
│   ├── PermissionPrompt.tsx    # Permission request UI
│   ├── SplitPane.tsx           # Split pane container for list/detail views
│   ├── StatusBadge.tsx         # Agent status indicator
│   └── Tab.tsx                 # Tab navigation component
│
├── pages/           # Page-level components
│   ├── DetailViewPage.tsx      # Full agent detail view with output scrolling
│   ├── ListViewPage.tsx        # Agent list view
│   └── NewAgentPage.tsx        # Multi-step agent creation form
│
├── demo/            # Demo mode with mock data
│   ├── index.tsx    # Demo mode entry point
│   ├── DemoApp.tsx  # Demo version of App with mock data and quick navigation
│   └── mockData.ts  # Mock agents, history, and helper functions
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
- **Interactive components**: PermissionPrompt, QuestionPrompt, MergePrompt
- **Layout components**: Layout, SplitPane
- **Page components**: DetailViewPage, ListViewPage, NewAgentPage
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

## Demo Mode

The `demo/` directory provides a testable version of the application with mock data:

```bash
npm run demo
```

This allows you to:
- Test UI changes without spawning real agents
- View all pages and states with consistent data
- Create screenshots and demos
- Verify keyboard navigation
- See permission prompts and all agent states

See `/DEMO.md` in the project root for full documentation on demo mode features.
