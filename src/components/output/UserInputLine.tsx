import React from 'react';
import { Box, Text } from 'ink';

interface UserInputLineProps {
  text: string;
}

export const UserInputLine = ({ text }: UserInputLineProps) => {
  return (
    <Box marginTop={1}>
      <Text color="blue" bold>You: </Text>
      <Text color="blue">{text}</Text>
    </Box>
  );
};
