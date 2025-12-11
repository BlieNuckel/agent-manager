import React from 'react';
import { Box, Text } from 'ink';
import type { PermissionSuggestion, PermissionDestination } from '../types';
import { SuggestionItem } from './SuggestionItem';
import { getDestinationInfo } from '../utils/permissions';

interface Props {
  suggestions: PermissionSuggestion[];
  destination: PermissionDestination;
}

export function SuggestionList({ suggestions, destination }: Props) {
  const destInfo = getDestinationInfo(destination);

  return (
    <Box flexDirection="column">
      <Text color="cyan">
        This will be saved to: {destInfo.filePath || destInfo.label}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {suggestions.map((suggestion, idx) => (
          <SuggestionItem key={idx} suggestion={suggestion} index={idx} />
        ))}
      </Box>
    </Box>
  );
}
