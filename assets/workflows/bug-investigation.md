---
id: bug-investigation
name: Bug Investigation
description: For bugs where the cause is unknown and requires investigation
version: 1

stages:
  - id: research
    agentType: research
    name: Investigation Phase
    description: Investigate the bug and find the root cause

  - id: implementation
    agentType: implement
    name: Fix Phase
    description: Implement the fix based on investigation findings

settings:
  allowSkip: []
---

# Bug Investigation Workflow

Use this workflow when you encounter a bug whose cause is not immediately obvious.

## When to Use

- Bugs with unclear root cause
- Issues that may span multiple files or systems
- Errors that require debugging and tracing

## Stages

1. **Investigation** - Research the bug, trace the error, identify root cause
2. **Fix** - Implement the fix based on findings

## Tips

- Be thorough in the investigation phase
- Document the root cause clearly
- The fix phase will use investigation findings as context
