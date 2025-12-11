import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const DiscardConfirmationPrompt = ({ onConfirm, onCancel }: Props) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} flexShrink={0}>
      <Text bold color="yellow">Discard changes?</Text>
      <Text dimColor>You have unsaved input in the form.</Text>
      <Box marginTop={1}>
        <Text bold>Discard and exit? </Text>
        <Text color="green">[y]</Text>
        <Text> Yes  </Text>
        <Text color="red">[n]</Text>
        <Text> No</Text>
      </Box>
    </Box>
  );
};
