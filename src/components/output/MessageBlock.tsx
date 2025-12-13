import React from 'react';
import { Box } from 'ink';
import { Markdown } from '../Markdown';

interface MessageBlockProps {
  lines: string[];
  width: number;
}

export const MessageBlock = ({ lines }: MessageBlockProps) => {
  const text = lines.join('\n');
  return (
    <Box flexDirection="column" marginTop={1}>
      <Markdown>{text}</Markdown>
    </Box>
  );
};
