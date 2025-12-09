import React from 'react';
import { Box, Text } from 'ink';
import { HoverWindow } from './HoverWindow';

export const HoverWindowExamples = () => {
  return (
    <>
      <HoverWindow
        title="Centered Modal"
        width={60}
        height={15}
        position="center"
        borderColor="cyan"
        dimBackground={true}
      >
        <Box flexDirection="column">
          <Text>This is a centered hover window with dimmed background.</Text>
          <Box marginTop={1}>
            <Text color="green">✓ Content stays on top</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="yellow">⚠ Background is dimmed</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press any key to continue...</Text>
          </Box>
        </Box>
      </HoverWindow>

      <HoverWindow
        title="Top Right Notification"
        width={40}
        position={{ top: 2, right: 2 }}
        borderColor="green"
        borderStyle="round"
        showBorder={true}
      >
        <Box flexDirection="column">
          <Text color="green">✓ Task completed successfully!</Text>
          <Text dimColor>This window is positioned at top-right</Text>
        </Box>
      </HoverWindow>

      <HoverWindow
        width="80%"
        height="50%"
        position="center"
        borderColor="yellow"
        title="Large Content Window"
        padding={2}
      >
        <Box flexDirection="column">
          <Text bold>Percentage-based sizing</Text>
          <Box marginTop={1}>
            <Text>This window is 80% of terminal width and 50% of height.</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>You can put any Ink components inside!</Text>
          </Box>
        </Box>
      </HoverWindow>

      <HoverWindow
        position={{ bottom: 2, left: 2 }}
        width={50}
        borderColor="magenta"
        borderStyle="double"
        showBorder={true}
      >
        <Box flexDirection="column">
          <Text color="magenta" bold>Bottom-left positioned</Text>
          <Text>This window is anchored to the bottom-left corner.</Text>
        </Box>
      </HoverWindow>

      <HoverWindow
        width={35}
        position={{ top: 5, left: 5 }}
        showBorder={false}
        backgroundColor="blue"
      >
        <Text color="white">Borderless with background color</Text>
      </HoverWindow>
    </>
  );
};
