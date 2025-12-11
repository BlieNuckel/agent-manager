import React from 'react';
import { Box, Text } from 'ink';
import type { PermissionSuggestion } from '../types';
import { formatPermissionRule } from '../utils/permissions';

interface Props {
  suggestion: PermissionSuggestion;
  index: number;
}

export function SuggestionItem({ suggestion, index }: Props) {
  switch (suggestion.type) {
    case 'addRules':
    case 'replaceRules':
    case 'removeRules':
      return <RuleSuggestion suggestion={suggestion} index={index} />;

    case 'setMode':
      return <ModeSuggestion suggestion={suggestion} index={index} />;

    case 'addDirectories':
    case 'removeDirectories':
      return <DirectorySuggestion suggestion={suggestion} index={index} />;

    default:
      return (
        <Text color="yellow">
          {index + 1}. Unknown permission update type: {(suggestion as any).type}
        </Text>
      );
  }
}

interface RuleSuggestionProps {
  suggestion: Extract<PermissionSuggestion, { type: 'addRules' | 'replaceRules' | 'removeRules' }>;
  index: number;
}

function RuleSuggestion({ suggestion, index }: RuleSuggestionProps) {
  const action =
    suggestion.type === 'addRules'
      ? 'Add'
      : suggestion.type === 'replaceRules'
      ? 'Replace with'
      : 'Remove';

  const plural = suggestion.rules.length > 1;

  return (
    <Box flexDirection="column">
      <Text>
        {index + 1}. {action} {suggestion.behavior} rule{plural ? 's' : ''}:
      </Text>
      <Box flexDirection="column" marginLeft={3}>
        {suggestion.rules.map((rule, rIdx) => (
          <Text key={rIdx}>• {formatPermissionRule(rule)}</Text>
        ))}
      </Box>
    </Box>
  );
}

interface ModeSuggestionProps {
  suggestion: Extract<PermissionSuggestion, { type: 'setMode' }>;
  index: number;
}

function ModeSuggestion({ suggestion, index }: ModeSuggestionProps) {
  return (
    <Text>
      {index + 1}. Set permission mode to: <Text color="yellow">{suggestion.mode}</Text>
    </Text>
  );
}

interface DirectorySuggestionProps {
  suggestion: Extract<PermissionSuggestion, { type: 'addDirectories' | 'removeDirectories' }>;
  index: number;
}

function DirectorySuggestion({ suggestion, index }: DirectorySuggestionProps) {
  const action = suggestion.type === 'addDirectories' ? 'Trust' : 'Untrust';
  const plural = suggestion.directories.length > 1;

  return (
    <Box flexDirection="column">
      <Text>
        {index + 1}. {action} director{plural ? 'ies' : 'y'}:
      </Text>
      <Box flexDirection="column" marginLeft={3}>
        {suggestion.directories.map((dir, dIdx) => (
          <Text key={dIdx}>• {dir}</Text>
        ))}
      </Box>
    </Box>
  );
}
