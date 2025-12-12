---
id: quick-fix
name: Quick Fix
description: For simple, well-understood changes that just need a plan
version: 1

stages:
  - id: planning
    agentType: plan
    name: Planning Phase
    description: Create a quick implementation plan

  - id: implementation
    agentType: implement
    name: Implementation Phase
    description: Execute the plan

settings:
  allowSkip: [planning]
---

# Quick Fix Workflow

A streamlined workflow for changes where you already understand the problem and solution.

## When to Use

- Simple bug fixes with known causes
- Small feature additions
- Straightforward refactoring tasks
- Changes you've already researched

## Stages

1. **Planning** - Quick plan to organize the changes
2. **Implementation** - Execute the changes

## Tips

- Skip the planning phase if the change is trivial
- Good for when you already know what needs to be done
