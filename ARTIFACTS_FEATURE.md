# Artifact System - Feature Documentation

## Overview

The Artifact System enables seamless context passing between agents. When one agent completes research or planning, you can save its findings to a markdown file and automatically pass that context to a new agent.

## User Workflow

### Step 1: Request Artifact from Current Agent

While viewing an agent in detail view:

1. Press `a` to trigger artifact creation
2. The agent receives a formatted instruction to save its findings
3. The system generates a unique artifact path: `~/.agent-manager/artifacts/TIMESTAMP_agent-title.md`

### Step 2: Agent Creates Artifact

The agent sees this instruction in its output:

```
[i] ═══════════════════════════════════════════════════════
[i] ARTIFACT REQUEST
[i] ═══════════════════════════════════════════════════════
[i] Please save your findings, plan, or research to:
[>] /Users/username/.agent-manager/artifacts/2024-12-04T10-30-45_research-findings.md

[i] Include in the markdown document:
[i] - A clear title/heading
[i] - Summary of key findings or the plan
[i] - Important details, steps, or considerations
[i] - Relevant code snippets, commands, or examples

[i] This artifact will be passed to another agent as context.
[i] ═══════════════════════════════════════════════════════
```

The agent will then use the Write tool to create the markdown file.

### Step 3: Automatic Transition to New Agent

After pressing `a`:

1. The system automatically opens the "New Agent" screen
2. A prominent "📄 Artifact Context" banner appears at the top
3. The artifact path is displayed in a magenta-colored box
4. You enter your prompt for the new agent
5. The new agent automatically receives the artifact path in its initial prompt

### Step 4: New Agent Uses Context

The new agent's prompt will include:

```
[Your custom prompt]

[Context from previous agent]
Please refer to the artifact at: /Users/username/.agent-manager/artifacts/2024-12-04T10-30-45_research-findings.md
Read this file for context before proceeding with the task.
```

## Visual Indicators

### 📄 Artifact Badge

Agents with artifacts display a 📄 emoji badge:

- **List View**: Badge appears next to agent title
- **Detail View**: Badge appears in header next to title
- **New Agent Screen**: "📄 Artifact Context" banner at top

### Artifact Info Display

In Detail View, agents with artifacts show:

```
┌─────────────────────────────────────────────────┐
│ 🔵 Research API Documentation 📄                │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Artifact: /path/to/artifact.md                  │
└─────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `a` | Detail View | Request artifact creation and open new agent screen |
| `Esc` | New Agent (with artifact) | Cancel and clear pending artifact |

## Technical Implementation

### File Storage

**Location**: `~/.agent-manager/artifacts/`

**Naming Convention**: `YYYY-MM-DDTHH-MM-SS_sanitized-title.md`

Example: `2024-12-04T10-30-45_api-research-findings.md`

### State Management

**Agent Type Enhancement**:
```typescript
interface Artifact {
  path: string;
  createdAt: Date;
}

interface Agent {
  // ... existing fields
  artifact?: Artifact;
}
```

**New Action**:
```typescript
{ type: 'SAVE_ARTIFACT'; id: string; artifact: Artifact }
```

### Event Flow

1. User presses `a` → `handleCreateArtifact()` in App.tsx
2. Generate artifact path using `generateArtifactFilename()`
3. Call `agentManager.requestArtifact(id, path)`
4. Manager emits `artifactRequested` event
5. Reducer updates agent with artifact info
6. UI transitions to new agent screen with `pendingArtifact` state
7. New agent created with artifact included in prompt

## Use Cases

### 1. Research → Implementation

```
Agent 1: "Research the best approach for implementing OAuth2"
↓ (press 'a')
Agent 2: "Implement OAuth2 based on the research findings"
```

### 2. Planning → Execution

```
Agent 1: "Plan the architecture for a new feature"
↓ (press 'a')
Agent 2: "Implement the feature according to the plan"
```

### 3. Investigation → Fix

```
Agent 1: "Investigate the bug in the payment system"
↓ (press 'a')
Agent 2: "Fix the bug based on the investigation"
```

### 4. Analysis → Documentation

```
Agent 1: "Analyze the codebase structure"
↓ (press 'a')
Agent 2: "Write documentation based on the analysis"
```

## Best Practices

1. **Clear Instructions**: When requesting an artifact, ensure the agent understands what to document
2. **Structured Output**: Encourage agents to use clear markdown structure (headings, lists, code blocks)
3. **Concise but Complete**: Artifacts should be thorough but focused on relevant information
4. **Prompt Design**: When creating the follow-up agent, reference the artifact explicitly in your prompt

## File Structure

```
src/
├── types/index.ts              # Artifact type definition
├── utils/artifacts.ts          # Artifact path generation
├── state/reducer.ts            # SAVE_ARTIFACT action
├── agent/manager.ts            # requestArtifact() method
├── components/
│   ├── App.tsx                 # Artifact state and handlers
│   └── AgentItem.tsx           # Artifact badge in list
└── pages/
    ├── DetailViewPage.tsx      # Artifact display and 'a' hotkey
    └── NewAgentPage.tsx        # Artifact context banner
```

## Future Enhancements

Potential improvements for the artifact system:

1. **Artifact Browser**: View all saved artifacts in a dedicated tab
2. **Multi-Artifact Support**: Attach multiple artifacts to a single agent
3. **Artifact Templates**: Predefined templates for different types of artifacts
4. **Artifact Versioning**: Track changes to artifacts over time
5. **Artifact Sharing**: Export/import artifacts between different projects
6. **Rich Artifact Types**: Support for JSON, YAML, or other structured formats
7. **Artifact Search**: Search through saved artifacts by content or metadata
