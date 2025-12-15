import React from 'react';
import { Box } from 'ink';
import { Markdown } from '../Markdown';

interface MessageBlockProps {
  lines: string[];
  width: number;
  skipLines?: number;
  maxLines?: number;
}

export const MessageBlock = ({ lines, skipLines = 0, maxLines }: MessageBlockProps) => {
  const text = lines.join('\n');

  if (skipLines === 0 && maxLines === undefined) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Markdown>{text}</Markdown>
      </Box>
    );
  }

  const allLines = text.split('\n');
  const endLine = maxLines !== undefined ? skipLines + maxLines : allLines.length;
  const visibleLines = allLines.slice(skipLines, endLine);
  const visibleText = visibleLines.join('\n');

  return (
    <Box flexDirection="column" marginTop={skipLines === 0 ? 1 : 0}>
      <Markdown>{visibleText}</Markdown>
    </Box>
  );
};
