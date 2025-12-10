# Feature Ideas: Context Management for Agent Manager

The core problem: Large contexts make agents dumber. These features help developers stay aware of chat contexts and naturally work in short, effective bursts, passing context between phases (research → planning → implementation).

---

## Context Awareness Features

### 1. Context Health Indicator (High Impact, Medium Effort)

Add a visual indicator showing approximate context usage in the detail view header.

```
┌─ Agent: Fix auth bug ─────────────────────────────┐
│ Status: working │ Context: ████████░░ 78% │ ⚠️    │
└───────────────────────────────────────────────────┘
```

**Implementation:**
- Track cumulative output length (already have `output: OutputLine[]`)
- Estimate tokens from character count (~4 chars/token)
- Color code: green (<50%), yellow (50-75%), red (>75%)
- The Claude Agent SDK might expose actual token counts - worth investigating

### 2. Context Breakdown Panel (Medium Impact, Low Effort)

When context is high, show what's consuming it:

```
Context Usage (est. 85k tokens):
├─ System prompt:     2k  (2%)
├─ Conversation:     15k (18%)
├─ Tool outputs:     58k (68%)  ← largest
└─ Code context:     10k (12%)
```

This helps devs understand *why* context is large (e.g., "I've read too many files").

### 3. Session Timer / Interaction Counter

Show how "long" a session has been running:

```
Session: 12 messages │ 23 tool calls │ 8 min active
```

This creates natural awareness without being prescriptive.

---

## Workflow Improvements

### 4. Agent Handoff / Spawn Successor (High Impact, Medium Effort)

When an agent goes idle, offer a "spawn successor" action that:
1. Auto-generates a summary artifact from the current session
2. Pre-populates a new agent prompt referencing that artifact
3. Suggests appropriate next-phase agent type

```
Agent idle. [c] Chat  [h] Handoff to new agent  [d] Done
```

Handoff flow:
```
> Creating handoff summary...
> Saved: ~/.agent-manager/artifacts/2024-03-15-auth-research-summary.md
>
> Spawn successor agent?
> Suggested prompt: "Based on the research in <artifact:auth-research-summary.md>,
>                    create an implementation plan for..."
> Agent type: [planning]
```

### 5. Workflow Templates (High Impact, Medium Effort)

Pre-defined multi-agent workflows. User selects a template when starting:

```
┌─ Select Workflow ─────────────────────────────────┐
│ [1] Single Agent (default)                        │
│ [2] Research → Plan → Implement                   │
│ [3] Investigate → Fix → Verify                    │
│ [4] Custom pipeline...                            │
└───────────────────────────────────────────────────┘
```

Each step auto-spawns the next agent with the previous output as artifact context.

### 6. Phase Markers in Conversation

Let users (or agents) mark phase transitions:

```
[PHASE: research] → [PHASE: design] → [PHASE: implement]
```

When a phase changes, prompt: "Start fresh agent for this phase? (recommended)"

---

## Artifact System Improvements

### 7. Auto-Extract Artifacts (High Impact, Medium Effort)

When agent output contains structured content (plans, findings), auto-save:

- Detect patterns like "## Implementation Plan", "## Findings", "## Summary"
- Offer to extract: "Save this plan as artifact? [y/n]"
- Or auto-save with notification: "Saved implementation plan to artifacts/"

### 8. Artifact Injection on Spawn

When creating a new agent, show relevant artifacts and let user select which to inject:

```
┌─ New Agent ───────────────────────────────────────┐
│ Prompt: Implement the auth changes                │
│                                                   │
│ Related artifacts (select to include):            │
│ [x] auth-research-summary.md (2 hours ago)        │
│ [x] auth-implementation-plan.md (1 hour ago)      │
│ [ ] old-api-design.md (3 days ago)                │
│                                                   │
│ Selected artifacts will be prepended to context.  │
└───────────────────────────────────────────────────┘
```

### 9. Structured Artifact Types

Instead of free-form markdown, have typed artifacts:

- `research.md` - Findings, sources, key insights
- `plan.md` - Step-by-step implementation plan with checkboxes
- `decision.md` - ADR-style decision records
- `handoff.md` - Context summary for next agent

Each type has a template and the UI can parse/display them specially.

### 10. Artifact Relationships

Track which artifacts were created by which agents, and which agents consumed them:

```
auth-plan.md
├─ Created by: "Research auth options" (agent-123)
├─ Used by: "Implement OAuth" (agent-456)
└─ Used by: "Add tests for auth" (agent-789)
```

---

## Smart Guardrails

### 11. Context Limit Warnings (High Impact, Low Effort)

When context exceeds a threshold, show a non-intrusive warning:

```
⚠️ Context is large (>80k tokens). Consider:
   • Spawning a fresh agent with artifact handoff
   • Summarizing findings so far
   Press [h] for handoff, [s] to summarize, [i] to ignore
```

### 12. Conversation Freshness Score

Track how "fresh" vs "stale" a conversation is:
- Fresh: Recent messages, focused topic
- Stale: Many old messages, topic drift

```
Freshness: ░░░░░░░░░░ (consider starting new agent)
```

### 13. Auto-Summarize on Idle

When agent goes idle after significant work, auto-generate a summary:

```
Agent idle. Generating session summary...
Summary saved to: auth-session-summary.md

Continue chatting or spawn fresh agent with summary?
```

---

## UI/UX Improvements

### 14. Split View for Artifact Reference

While chatting, show relevant artifact in a side panel:

```
┌─ Agent Output ────────┐┌─ Artifact: plan.md ───┐
│ Working on step 3...  ││ ## Steps              │
│ Creating user model   ││ [x] 1. Setup DB       │
│ ...                   ││ [x] 2. Create models  │
│                       ││ [ ] 3. Add routes  ←  │
└───────────────────────┘└───────────────────────┘
```

### 15. Quick Context Actions

Keyboard shortcuts for context management:
- `Ctrl+S`: Summarize & save artifact
- `Ctrl+H`: Handoff to new agent
- `Ctrl+R`: Reset context (start fresh with same goal)

### 16. Agent Lineage View

Show the "family tree" of related agents:

```
Research auth options
    └─→ Plan auth implementation (handoff)
            └─→ Implement OAuth flow (handoff)
            └─→ Add auth tests (parallel)
```

---

## Priority Recommendations

### Phase 1: Start Here (High Impact, Reasonable Effort)

1. **Context Health Indicator** - Simple visual feedback
2. **Agent Handoff** - The killer feature for context management
3. **Auto-Extract Artifacts** - Reduce manual artifact creation friction
4. **Artifact Injection on Spawn** - Make context passing explicit

### Phase 2: Build On Success

5. **Context Limit Warnings** - Nudge users before context degrades
6. **Workflow Templates** - Formalize best practices
7. **Auto-Summarize on Idle** - Zero-friction artifact creation

### Phase 3: Polish

8. **Context Breakdown Panel** - Deeper insights
9. **Agent Lineage View** - Visual workflow tracking
10. **Split View for Artifacts** - Better reference during work
