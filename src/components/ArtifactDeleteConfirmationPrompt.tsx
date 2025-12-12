import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  artifactName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ArtifactDeleteConfirmationPrompt = ({ artifactName, onConfirm, onCancel }: Props) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} flexShrink={0}>
      <Text bold color="yellow">⚠️  Delete Artifact?</Text>
      <Text>
        Artifact <Text color="cyan">{artifactName}</Text> will be permanently deleted.
      </Text>
      <Text dimColor>This action cannot be undone.</Text>
      <Box marginTop={1}>
        <Text bold>Are you sure you want to delete? </Text>
        <Text color="green">[y]</Text>
        <Text> Yes  </Text>
        <Text color="red">[n]</Text>
        <Text> No</Text>
      </Box>
    </Box>
  );
};
