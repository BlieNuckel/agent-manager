---
id: investigation
name: Investigation Report
description: Document debugging sessions and investigation results
schema:
  requiredFields:
    - title
  optionalFields:
    - agent
    - issue
    - root_cause
    - solution
---
# {{title}}

Agent: {{agent}}
Created: {{date}}

## Issue Description
{{issue}}

## Investigation Steps

## Root Cause
{{root_cause}}

## Solution
{{solution}}
