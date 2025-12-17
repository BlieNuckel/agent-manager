import React, { useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, PermissionSuggestion, PermissionDestination } from '../types';
import { formatToolInput } from '../utils/helpers';
import { getDestinationInfo } from '../utils/permissions';
import { SuggestionList } from './SuggestionList';

function validateSuggestions(suggestions: unknown[]): PermissionSuggestion[] {
  const validated: PermissionSuggestion[] = [];

  for (const suggestion of suggestions) {
    if (isSuggestion(suggestion)) {
      validated.push(suggestion);
    }
  }

  return validated;
}

function isSuggestion(value: unknown): value is PermissionSuggestion {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as any;

  if (!('type' in obj) || !('destination' in obj)) return false;

  switch (obj.type) {
    case 'addRules':
    case 'replaceRules':
    case 'removeRules':
      return 'rules' in obj && 'behavior' in obj;
    case 'setMode':
      return 'mode' in obj;
    case 'addDirectories':
    case 'removeDirectories':
      return 'directories' in obj;
    default:
      return false;
  }
}

export const PermissionPrompt = ({
  permission,
  queueCount = 0,
  hasPendingMerge = false,
}: {
  permission: PermissionRequest;
  queueCount?: number;
  hasPendingMerge?: boolean;
}) => {
  const groupedSuggestions = useMemo(() => {
    if (!permission.suggestions || permission.suggestions.length === 0) {
      return {};
    }

    const validated = validateSuggestions(permission.suggestions);
    const groups: Record<string, PermissionSuggestion[]> = {};

    for (const suggestion of validated) {
      const dest = suggestion.destination;
      if (!groups[dest]) {
        groups[dest] = [];
      }
      groups[dest].push(suggestion);
    }

    return groups as Record<PermissionDestination, PermissionSuggestion[]>;
  }, [permission.suggestions]);

  const hasRepoSuggestions = 'projectSettings' in groupedSuggestions;
  const hasLocalSuggestions = 'localSettings' in groupedSuggestions;
  const hasUserSuggestions = 'userSettings' in groupedSuggestions;
  const hasSessionSuggestions = 'session' in groupedSuggestions;
  const hasSuggestions = Object.keys(groupedSuggestions).length > 0;

  const handleInput = useCallback(
    (input: string, key: any) => {
      // Skip merge-related keys if there's a pending merge
      if (hasPendingMerge && (input === 'y' || input === 'n' || input === 'p')) {
        return;
      }

      if (input === 'y' || input === 'Y') {
        permission.resolve({ allowed: true });
        return;
      }

      if (input === 'n' || input === 'N') {
        permission.resolve({ allowed: false });
        return;
      }

      if ((input === 'r' || input === 'R') && hasRepoSuggestions) {
        permission.resolve({
          allowed: true,
          suggestions: groupedSuggestions.projectSettings,
        });
        return;
      }

      if ((input === 'l' || input === 'L') && hasLocalSuggestions) {
        permission.resolve({
          allowed: true,
          suggestions: groupedSuggestions.localSettings,
        });
        return;
      }

      if ((input === 'u' || input === 'U') && hasUserSuggestions) {
        permission.resolve({
          allowed: true,
          suggestions: groupedSuggestions.userSettings,
        });
        return;
      }

      if ((input === 's' || input === 'S') && hasSessionSuggestions) {
        permission.resolve({
          allowed: true,
          suggestions: groupedSuggestions.session,
        });
        return;
      }
    },
    [
      permission,
      hasRepoSuggestions,
      hasLocalSuggestions,
      hasUserSuggestions,
      hasSessionSuggestions,
      groupedSuggestions,
      hasPendingMerge,
    ]
  );

  useInput(handleInput);

  const getShortcutHint = () => {
    const shortcuts = ['y/n'];
    if (hasRepoSuggestions) shortcuts.push('r');
    if (hasLocalSuggestions) shortcuts.push('l');
    if (hasUserSuggestions) shortcuts.push('u');
    if (hasSessionSuggestions) shortcuts.push('s');
    return shortcuts.join('/');
  };

  return (
    <Box flexDirection="column" flexShrink={0} borderStyle="round" borderColor="yellow" padding={1}>
      <Box>
        <Text color="yellow" bold>
          [!] Permission Request
        </Text>
        {queueCount > 0 && <Text dimColor> (+{queueCount} more pending)</Text>}
      </Box>

      <Box marginTop={1}>
        <Text>Tool: </Text>
        <Text color="cyan" bold>
          {permission.toolName}
        </Text>
      </Box>

      <Box>
        <Text dimColor>Input: {formatToolInput(permission.toolInput)}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Available Actions:</Text>
        <Text>
          <Text color="green">[Y]</Text>es - Allow once
        </Text>
        <Text>
          <Text color="red">[N]</Text>o - Deny
        </Text>
      </Box>

      {hasSuggestions && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Save for future (always allow):</Text>

          {hasRepoSuggestions && (
            <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1}>
              <Text color="blue" bold>
                [{getDestinationInfo('projectSettings').shortcut}]epo ({getDestinationInfo('projectSettings').filePath}):
              </Text>
              <SuggestionList suggestions={groupedSuggestions.projectSettings} destination="projectSettings" />
            </Box>
          )}

          {hasLocalSuggestions && (
            <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1}>
              <Text color="blue" bold>
                [{getDestinationInfo('localSettings').shortcut}]ocal ({getDestinationInfo('localSettings').filePath}):
              </Text>
              <SuggestionList suggestions={groupedSuggestions.localSettings} destination="localSettings" />
            </Box>
          )}

          {hasUserSuggestions && (
            <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1}>
              <Text color="blue" bold>
                [{getDestinationInfo('userSettings').shortcut}]ser ({getDestinationInfo('userSettings').filePath}):
              </Text>
              <SuggestionList suggestions={groupedSuggestions.userSettings} destination="userSettings" />
            </Box>
          )}

          {hasSessionSuggestions && (
            <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1}>
              <Text color="blue" bold>
                [{getDestinationInfo('session').shortcut}]ession (not saved to file):
              </Text>
              <SuggestionList suggestions={groupedSuggestions.session} destination="session" />
            </Box>
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>{getShortcutHint()} to choose</Text>
      </Box>
    </Box>
  );
};
