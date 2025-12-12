# Clank Manager

```
   _______           __     __  ___
  / ___/ /__ ______ / /_   /  |/  /__ ____  ___ ____ ____ ____
 / /__/ / _ `/ _ \/ '_/   / /|_/ // _ `/ _ \/ _ `/ _ `/ -_) __/
 \___/_/\_,_/_//_/_/\_\  /_/  /_/ \_,_/_//_/\_,_/\_, /\__/_/
                                                 /___/
```

> A powerful Terminal User Interface (TUI) for managing multiple Claude Agent SDK instances

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Run the application
npm start
```

That's it! You're now managing Claude agents in your terminal.

## 📋 Prerequisites

- **Node.js** 18+ (ESM support required)
- **Anthropic API Key** - Get yours at [console.anthropic.com](https://console.anthropic.com)
- **Git** (optional, for worktree features)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agent-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your API key**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

   Or add it to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
   ```bash
   echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
   ```

4. **Run the app**
   ```bash
   npm start
   ```

## 🎮 Usage

### Creating Your First Agent

1. Press `n` to create a new agent
2. Choose an agent type:
   - **Normal** - Standard agent with permission prompts
   - **Auto-accept** - Auto-approves file edit operations
   - **Planning** - Planning mode for design work
3. Enter your task description
4. Watch your agent work!

### Navigation

- `↑/↓` or `j/k` - Navigate agent list
- `Enter` - View agent details
- `n` - Create new agent
- `d` - Delete selected agent
- `q` - Quit application

### Agent Detail View

- `p` - Approve pending permissions
- `r` - Reject pending permissions
- `k` - Kill running agent
- `a` - View artifacts
- `Esc` - Back to list view

## ✨ Features

### 🤖 Multiple Agent Types
- **Normal Agents** - Full control with permission approval
- **Auto-accept Agents** - Streamlined workflow for trusted tasks
- **Planning Agents** - Design and architecture mode

### 🌳 Git Worktree Integration
- Isolated working directories per agent
- Automatic branch creation
- Merge preview and approval flow
- Safe experimentation without affecting main branch

### 📦 Shared Artifacts
- Agents can read/write to `~/.agent-manager/artifacts/`
- Share research, plans, and documentation between agents
- Persistent knowledge base across sessions

### 🔐 Smart Permission System
- Granular control over file operations and bash commands
- Permission queue for multiple simultaneous requests
- Auto-allow for trusted paths (artifacts directory)

### 🎨 Rich Terminal UI
- Real-time output streaming
- Syntax-highlighted markdown rendering
- Spinner indicators for active operations
- Clean, intuitive interface

## 📚 Commands

```bash
# Production
npm start              # Run the application

# Development
npm run dev           # Run with auto-reload on changes
npm run demo          # Run with mock data (no API calls)

# Testing
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Generate coverage report

# Specific test file
npx vitest src/utils/helpers.test.ts
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│           React/Ink TUI                 │
│  (src/components/, src/pages/)          │
├─────────────────────────────────────────┤
│         State Management                │
│  (useReducer + History Persistence)     │
├─────────────────────────────────────────┤
│       AgentSDKManager                   │
│  (EventEmitter-based Agent Wrapper)     │
├─────────────────────────────────────────┤
│      Claude Agent SDK                   │
│  (@anthropic-ai/claude-agent-sdk)       │
└─────────────────────────────────────────┘
```

### Key Components

- **`App.tsx`** - Main orchestrator using reducer pattern
- **`agent/manager.ts`** - Agent SDK wrapper with event system
- **`git/worktree.ts`** - Git worktree isolation utilities
- **`state/reducer.ts`** - State management with actions
- **`pages/`** - View layer (List, Detail, NewAgent, Artifact)

## 🔧 Development

### Project Structure

```
src/
├── agent/              # Agent SDK management
├── components/         # Reusable UI components
├── pages/             # Page-level views
├── state/             # State management
├── git/               # Git worktree utilities
├── utils/             # Helpers and utilities
├── types/             # TypeScript definitions
└── demo/              # Demo mode with mock data
```

### Running Tests

```bash
# Watch mode (recommended during development)
npm test

# Single run (CI/CD)
npm run test:run

# With coverage report
npm run test:coverage
```

Tests use:
- **Vitest** - Fast unit test framework
- **ink-testing-library** - Component testing utilities

### Demo Mode

Test the UI without making API calls:

```bash
npm run demo
```

This runs with mock agents and simulated output, perfect for:
- UI development
- Testing edge cases
- Demonstrating features
- Developing without consuming API credits

## 🌟 Tips & Tricks

### Agent Artifacts

Agents can share knowledge via the artifacts directory:

```bash
# Agents automatically have access to:
~/.agent-manager/artifacts/

# Example: Agent saves research
# Then another agent reads it for context
```

### Worktree Workflow

1. Enable worktree when creating an agent
2. Agent works in isolated branch
3. Review changes in detail view
4. Approve merge when satisfied
5. Changes automatically integrated to main

### Permission Management

- **Normal mode**: Approve each operation individually
- **Auto-accept mode**: File edits approved automatically
- **Artifacts path**: Always allowed without prompts

## 🐛 Troubleshooting

### API Key Issues

```bash
# Verify your API key is set
echo $ANTHROPIC_API_KEY

# Should output: sk-ant-...
```

### Port/Display Issues

The app uses your terminal's TTY. If you see display issues:
- Ensure you're running in a proper terminal (not embedded)
- Try resizing your terminal window
- Check that your terminal supports ANSI colors

### Worktree Conflicts

If git worktrees fail to create:

```bash
# Clean up stale worktrees
git worktree prune
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! This is a tool for developers, by developers.

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

Built with:
- [Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-typescript) by Anthropic
- [Ink](https://github.com/vadimdemedes/ink) for React-based terminal UIs
- [Vitest](https://vitest.dev/) for blazing fast testing

---

**Made with ⚡ for Claude Agent workflows**
