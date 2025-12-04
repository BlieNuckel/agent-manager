# Demo Mode

This directory contains the demo mode implementation for Agent Manager.

## Files

- **`index.tsx`** - Entry point for demo mode (`npm run demo`)
- **`DemoApp.tsx`** - Demo version of the main App component with mock data
- **`mockData.ts`** - Mock agents, history entries, and helper functions

## Quick Start

```bash
npm run demo
```

## Purpose

Demo mode allows you to:
- View all UI pages without spawning real agents
- Test UI changes with consistent mock data
- Create screenshots and demos
- Verify keyboard navigation
- Test all agent states (working, waiting, done, error)

## Key Features

1. **Quick Navigation**: Press 1-4 to jump to different pages
2. **Auto-Cycling**: Press 'c' to automatically cycle through all pages
3. **Mock Permission Prompts**: See permission UI without real tool execution
4. **All Agent States**: View agents in working, waiting, done, and error states
5. **Worktree Integration**: See how worktree agents appear in the UI

## Customization

Edit `mockData.ts` to customize:
- Number of mock agents
- Agent statuses and output
- History entries
- Permission requests
- Worktree configurations

See `/DEMO.md` in the project root for full documentation.
