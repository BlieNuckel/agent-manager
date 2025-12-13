import React from 'react';
import { Box, Text } from 'ink';
import type { ArtifactInfo } from '../types';
import { formatTime } from '../utils/helpers';

export const ArtifactItem = React.memo(({ artifact, selected }: { artifact: ArtifactInfo; selected: boolean }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={selected ? 'cyan' : 'white'} bold={selected}>{selected ? '> ' : '  '}</Text>
        <Text bold={selected} color={selected ? 'cyan' : 'white'}>{artifact.name}</Text>
        {artifact.templateId && (
          <Text color="magenta"> [{artifact.templateId}]</Text>
        )}
        <Text dimColor> ({formatTime(artifact.modifiedAt)})</Text>
      </Box>
    </Box>
  );
});
