---
id: plan
name: Implementation Plan
description: A phased implementation plan with status tracking
schema:
  requiredFields:
    - title
    - phases
  optionalFields:
    - agent
    - notes
---
# {{title}}

Agent: {{agent}}
Created: {{date}}

## Phases
{{#each phases}}
### {{name}}
Status: {{status}}

{{/each}}

## Notes
{{notes}}
