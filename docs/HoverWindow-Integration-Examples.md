# HoverWindow Integration Examples

Practical examples showing how to integrate the HoverWindow component into the Agent Manager application.

## Example 1: Success Notification

Show a temporary success notification in the top-right corner:

```tsx
// In App.tsx
import { HoverWindow } from './components/HoverWindow';

const App = () => {
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const hoverWindows = notification ? (
    <HoverWindow
      width={45}
      position={{ top: 2, right: 2 }}
      borderColor="green"
      borderStyle="round"
      title="Success"
    >
      <Text color="green">✓ {notification}</Text>
    </HoverWindow>
  ) : undefined;

  return (
    <Layout
      // ... other props
      hoverWindows={hoverWindows}
    >
      {/* content */}
    </Layout>
  );
};

// Usage:
// showNotification('Agent created successfully');
```

## Example 2: Confirmation Dialog

Replace the current non-modal confirmation prompts with centered modal dialogs:

```tsx
// Enhanced quit confirmation using HoverWindow
const App = () => {
  const [showQuitModal, setShowQuitModal] = useState(false);

  const hoverWindows = showQuitModal ? (
    <HoverWindow
      title="Confirm Quit"
      width={60}
      height={10}
      position="center"
      borderColor="yellow"
      dimBackground={true}
    >
      <Box flexDirection="column">
        <Text color="yellow" bold>⚠️  Active Agents Running</Text>
        <Box marginTop={1}>
          <Text>
            You have <Text color="cyan">{activeCount}</Text> active agents.
          </Text>
        </Box>
        <Text dimColor>Quitting will terminate all running agents.</Text>
        <Box marginTop={1} gap={2}>
          <Text bold>Are you sure? </Text>
          <Text color="green">[y]</Text>
          <Text> Yes  </Text>
          <Text color="red">[n]</Text>
          <Text> No</Text>
        </Box>
      </Box>
    </HoverWindow>
  ) : undefined;

  return (
    <Layout hoverWindows={hoverWindows}>
      {/* content */}
    </Layout>
  );
};
```

## Example 3: Agent Details Popup

Show agent details in a popup without navigating away from the list:

```tsx
const App = () => {
  const [selectedAgentForPreview, setSelectedAgentForPreview] = useState<string | null>(null);

  const handlePreviewAgent = (agentId: string) => {
    // Press 'p' to preview instead of Enter to open detail view
    setSelectedAgentForPreview(agentId);
  };

  const previewAgent = state.agents.find(a => a.id === selectedAgentForPreview);

  const hoverWindows = previewAgent ? (
    <HoverWindow
      title={`Preview: ${previewAgent.title}`}
      width="80%"
      height="70%"
      position="center"
      borderColor="cyan"
      dimBackground={true}
    >
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>Status: </Text>
          <StatusBadge status={previewAgent.status} />
        </Box>
        <Box marginBottom={1}>
          <Text dimColor>Prompt: </Text>
          <Text>{previewAgent.prompt}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Text dimColor>Recent Output:</Text>
          <Box flexDirection="column" marginTop={1}>
            {previewAgent.output.slice(-10).map((line, idx) => (
              <Text key={idx}>{line.text}</Text>
            ))}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to close • Enter for full view</Text>
        </Box>
      </Box>
    </HoverWindow>
  ) : undefined;

  return (
    <Layout hoverWindows={hoverWindows}>
      {/* content */}
    </Layout>
  );
};
```

## Example 4: Command Palette as Overlay

Convert the command palette to a true overlay:

```tsx
const App = () => {
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const hoverWindows = showCommandPalette ? (
    <HoverWindow
      title="Command Palette"
      width={80}
      height={20}
      position="center"
      borderColor="cyan"
      dimBackground={true}
    >
      <CommandPalette
        commands={commands}
        onExecute={(cmd) => {
          handleExecuteCommand(cmd);
          setShowCommandPalette(false);
        }}
        onCancel={() => setShowCommandPalette(false)}
        loading={commandsLoading}
      />
    </HoverWindow>
  ) : undefined;

  return (
    <Layout hoverWindows={hoverWindows}>
      {/* content */}
    </Layout>
  );
};
```

## Example 5: Progress Indicator

Show a non-blocking progress indicator while agents are spawning:

```tsx
const App = () => {
  const [spawningAgent, setSpawningAgent] = useState<{ title: string; progress: number } | null>(null);

  const handleSpawnAgent = async (title: string, prompt: string, agentType: AgentType, worktree: any) => {
    setSpawningAgent({ title, progress: 0 });

    // Simulate progress updates (or use real progress from agent manager)
    const progressInterval = setInterval(() => {
      setSpawningAgent(prev => prev ? { ...prev, progress: Math.min(prev.progress + 10, 90) } : null);
    }, 200);

    try {
      await actualSpawnLogic(title, prompt, agentType, worktree);
      setSpawningAgent({ title, progress: 100 });
      setTimeout(() => setSpawningAgent(null), 1000);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const hoverWindows = spawningAgent ? (
    <HoverWindow
      width={60}
      position={{ bottom: 2, left: 2 }}
      borderColor="blue"
      borderStyle="round"
    >
      <Box flexDirection="column">
        <Text color="blue">Creating agent: {spawningAgent.title}</Text>
        <Box marginTop={1}>
          <Text>Progress: </Text>
          <Text color="cyan">{spawningAgent.progress}%</Text>
        </Box>
      </Box>
    </HoverWindow>
  ) : undefined;

  return (
    <Layout hoverWindows={hoverWindows}>
      {/* content */}
    </Layout>
  );
};
```

## Example 6: Multiple Hover Windows

Show multiple windows simultaneously (e.g., notification + progress):

```tsx
const App = () => {
  const [notification, setNotification] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const hoverWindows = (
    <>
      {notification && (
        <HoverWindow
          width={45}
          position={{ top: 2, right: 2 }}
          borderColor="green"
          title="Notification"
        >
          <Text color="green">✓ {notification}</Text>
        </HoverWindow>
      )}

      {showHelp && (
        <HoverWindow
          title="Quick Help"
          width={70}
          height={15}
          position="center"
          borderColor="yellow"
          dimBackground={true}
        >
          <Box flexDirection="column">
            <Text bold>Keyboard Shortcuts</Text>
            <Box marginTop={1} flexDirection="column">
              <Text><Text color="cyan">n</Text> - New agent</Text>
              <Text><Text color="cyan">Enter</Text> - View details</Text>
              <Text><Text color="cyan">d</Text> - Delete agent</Text>
              <Text><Text color="cyan">q</Text> - Quit</Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Press Esc to close</Text>
            </Box>
          </Box>
        </HoverWindow>
      )}
    </>
  );

  return (
    <Layout hoverWindows={hoverWindows}>
      {/* content */}
    </Layout>
  );
};
```

## Tips for Integration

1. **State Management**: Use React state to control when hover windows appear
2. **Multiple Windows**: Wrap multiple HoverWindow components in a fragment (`<>...</>`)
3. **Input Handling**: Remember that hover windows don't automatically capture input - handle keyboard events in the parent component
4. **Z-Index**: Windows rendered later in the tree appear on top of earlier ones
5. **Performance**: Conditionally render hover windows (use `&&` or ternary) to avoid rendering when not needed
6. **Accessibility**: Always provide a way to dismiss the window (keyboard shortcut, timeout, etc.)
