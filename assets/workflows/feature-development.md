---
id: feature-development
name: Feature Development
description: Full workflow for implementing new features with research, planning, and implementation
version: 1

stages:
  - id: research
    agentType: research
    name: Research Phase
    description: Explore the codebase to understand current implementation

  - id: analysis
    agentType: analyze
    name: Analysis Phase
    description: Research solutions and weigh options

  - id: planning
    agentType: plan
    name: Planning Phase
    description: Create detailed implementation plan

  - id: implementation
    agentType: implement
    name: Implementation Phase
    description: Execute the plan and make code changes

settings:
  allowSkip: [research, analysis]
---

# Feature Development Workflow

This workflow guides you through implementing a new feature with proper research and planning.

## When to Use

- Adding significant new functionality
- Features that touch multiple parts of the codebase
- When you're unfamiliar with the relevant code areas

## Stages

1. **Research** - Understand the current codebase state
2. **Analysis** - Research solutions and pick the best approach
3. **Planning** - Create a detailed implementation plan
4. **Implementation** - Execute the plan

## Tips

- Take time in the research phase to thoroughly explore
- The analysis phase should result in a clear recommendation
- Review the plan carefully before approving implementation
