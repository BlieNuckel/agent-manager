# Demo Mode

Agent Manager includes a demo mode that allows you to explore all UI pages with realistic mock data without spawning any real Claude agents.

## Running Demo Mode

```bash
npm run demo
```

## Features

### Mock Data
The demo mode includes realistic mock data:
- **5 mock agents** with various states:
  - Waiting for permission (with permission prompt)
  - Active/working
  - Completed successfully
  - Failed with error
  - Planning mode
- **5 history entries** showing past agent runs
- Realistic output logs and timestamps
- Sample worktree integration scenarios

### Navigation

#### Quick Page Access
Press number keys to jump directly to different pages:
- `1` - List View (Inbox with agents)
- `2` - Detail View (showing agent with permission prompt)
- `3` - History View
- `4` - New Agent Input Form

#### Auto-Cycling Mode
Press `c` to toggle auto-cycling through all pages. The demo will automatically:
1. Show inbox with first agent selected
2. Navigate through different agents
3. Open detail views
4. Show completed agents
5. Switch to history tab
6. Show the input form
7. Loop back to the start

Press `c` again to stop auto-cycling and regain manual control.

#### Standard Navigation
All standard keyboard shortcuts work:
- `Tab` - Switch between Inbox/History tabs
- `↑/↓` or `k/j` - Navigate up/down in lists
- `Enter` - Open selected agent/history item
- `q` or `Esc` - Go back/quit
- `n` - Open new agent form

### Mock Agent States

The demo includes agents demonstrating all possible states:

1. **agent-1**: Waiting for permission
   - Shows permission prompt for Write tool
   - Demonstrates the approval flow
   - Has worktree enabled

2. **agent-2**: Active/Working
   - Shows ongoing output stream
   - Auto-accept permissions enabled
   - Demonstrates real-time updates

3. **agent-3**: Completed Successfully
   - Shows full output history
   - Demonstrates successful completion state
   - Includes test results

4. **agent-4**: Failed with Error
   - Shows error state
   - Demonstrates error handling
   - Includes error messages in output

5. **agent-5**: Planning Mode
   - Shows planning agent type
   - Has worktree integration
   - Demonstrates analysis output

## Use Cases

### Development
- Test UI changes without spawning real agents
- Verify layout and styling across all pages
- Debug rendering issues with known data
- Develop new features with consistent test data

### Demos and Screenshots
- Show all features to stakeholders
- Create documentation screenshots
- Record demo videos
- Onboard new team members

### Testing
- Verify all UI states render correctly
- Test keyboard navigation
- Validate permission prompt UI
- Check responsiveness of components

## Technical Details

### Mock Data Location
Mock data is defined in `src/demo/mockData.ts`:
- `mockAgents`: Array of 5 agents with different states
- `mockHistory`: Array of 5 history entries
- Helper functions to create additional mock data

### Demo App Component
`src/demo/DemoApp.tsx` is a modified version of the main App that:
- Uses mock data instead of real AgentSDKManager
- Adds quick navigation shortcuts (1-4 keys)
- Implements auto-cycling functionality
- Disables real agent spawning
- Shows demo-specific help text

### Customizing Mock Data

To customize the mock data for your testing needs:

1. Edit `src/demo/mockData.ts`
2. Modify existing agents or add new ones
3. Change output logs, statuses, or timing
4. Add or remove history entries

Example:
```typescript
export const mockAgents: Agent[] = [
  {
    id: 'custom-agent',
    title: 'My Custom Test Agent',
    status: 'working',
    prompt: 'Test prompt...',
    output: ['Custom output 1', 'Custom output 2'],
    // ... other properties
  },
  // ... more agents
];
```

## Limitations

- No real agents are spawned
- Permission responses are logged but don't affect behavior
- No actual file system operations
- History is not persisted
- Git worktree operations are simulated
- AgentSDKManager events are not fired

These limitations are by design to make demo mode safe and predictable for testing and demonstration purposes.
