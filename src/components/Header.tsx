import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  activeCount: number;
  waitingCount: number;
}

export const Header = ({ activeCount, waitingCount }: HeaderProps) => {
  return (
    <Box>
      <Text bold color="cyan">🤖 Agent Manager</Text>
      <Text dimColor> v2 (SDK)</Text>
      <Text dimColor> • {activeCount} active</Text>
      {waitingCount > 0 && (
        <Text color="yellow"> • {waitingCount} waiting</Text>
      )}
    </Box>
  );
};
