import React from 'react';
import { Box, Text } from 'ink';

interface ToolGroupBlockProps {
  count: number;
  lines: string[];
  collapsed: boolean;
  blockNumber: number;
}

export const ToolGroupBlock = ({
  count,
  lines,
  collapsed,
  blockNumber,
}: ToolGroupBlockProps) => {
  const arrow = collapsed ? '▸' : '▾';

  if (collapsed) {
    return (
      <Box>
        <Text dimColor>
          <Text color="cyan">[{blockNumber}]</Text> {arrow} {count} tool call{count !== 1 ? 's' : ''}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>
          <Text color="cyan">[{blockNumber}]</Text> {arrow} {count} tool call{count !== 1 ? 's' : ''}
        </Text>
      </Box>
      {lines.map((line, i) => (
        <Box key={i} paddingLeft={4}>
          <Text dimColor>{line}</Text>
        </Box>
      ))}
    </Box>
  );
};
