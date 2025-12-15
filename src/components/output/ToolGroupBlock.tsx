import React from 'react';
import { Box, Text } from 'ink';

interface ToolGroupBlockProps {
  count: number;
  lines: string[];
  collapsed: boolean;
  blockNumber: number;
  skipLines?: number;
  maxLines?: number;
}

export const ToolGroupBlock = ({
  count,
  lines,
  collapsed,
  blockNumber,
  skipLines = 0,
  maxLines,
}: ToolGroupBlockProps) => {
  const arrow = collapsed ? '▸' : '▾';

  if (collapsed) {
    if (skipLines > 0) return null;
    return (
      <Box>
        <Text dimColor>
          <Text color="cyan">[{blockNumber}]</Text> {arrow} {count} tool call{count !== 1 ? 's' : ''}
        </Text>
      </Box>
    );
  }

  const showHeader = skipLines === 0;
  const contentSkipLines = showHeader ? Math.max(0, skipLines) : Math.max(0, skipLines - 1);
  const endLine = maxLines !== undefined ? contentSkipLines + (maxLines - (showHeader ? 1 : 0)) : lines.length;
  const visibleLines = lines.slice(contentSkipLines, endLine);

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Box>
          <Text dimColor>
            <Text color="cyan">[{blockNumber}]</Text> {arrow} {count} tool call{count !== 1 ? 's' : ''}
          </Text>
        </Box>
      )}
      {visibleLines.map((line, i) => (
        <Box key={contentSkipLines + i} paddingLeft={4}>
          <Text dimColor>{line}</Text>
        </Box>
      ))}
    </Box>
  );
};
