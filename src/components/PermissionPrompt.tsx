import React, { useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, PermissionSuggestion, PermissionDestination } from '../types';
import type { CompactListItem } from '../types/prompts';
import { formatToolInput } from '../utils/helpers';
import { getDestinationInfo } from '../utils/permissions';
import { CompactListSelect } from './CompactListSelect';

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

  // Build items for CompactListSelect
  const items = useMemo(() => {
    const listItems: CompactListItem[] = [
      {
        key: 'allow',
        shortcut: 'y',
        label: 'Yes - Allow once',
        disabled: hasPendingMerge,
      },
      {
        key: 'deny',
        shortcut: 'n',
        label: 'No - Deny',
        disabled: hasPendingMerge,
      },
    ];

    if (hasRepoSuggestions) {
      const info = getDestinationInfo('projectSettings');
      listItems.push({
        key: 'repo',
        shortcut: 'r',
        label: 'Repo - Save to project',
        description: info.filePath,
      });
    }

    if (hasLocalSuggestions) {
      const info = getDestinationInfo('localSettings');
      listItems.push({
        key: 'local',
        shortcut: 'l',
        label: 'Local - Save locally',
        description: info.filePath,
      });
    }

    if (hasUserSuggestions) {
      const info = getDestinationInfo('userSettings');
      listItems.push({
        key: 'user',
        shortcut: 'u',
        label: 'User - Save globally',
        description: info.filePath,
      });
    }

    if (hasSessionSuggestions) {
      listItems.push({
        key: 'session',
        shortcut: 's',
        label: 'Session - This session only',
        description: 'not saved to file',
      });
    }

    return listItems;
  }, [hasRepoSuggestions, hasLocalSuggestions, hasUserSuggestions, hasSessionSuggestions, hasPendingMerge]);

  const handleSelect = useCallback(
    (key: string) => {
      switch (key) {
        case 'allow':
          permission.resolve({ allowed: true });
          break;
        case 'deny':
          permission.resolve({ allowed: false });
          break;
        case 'repo':
          permission.resolve({
            allowed: true,
            suggestions: groupedSuggestions.projectSettings,
          });
          break;
        case 'local':
          permission.resolve({
            allowed: true,
            suggestions: groupedSuggestions.localSettings,
          });
          break;
        case 'user':
          permission.resolve({
            allowed: true,
            suggestions: groupedSuggestions.userSettings,
          });
          break;
        case 'session':
          permission.resolve({
            allowed: true,
            suggestions: groupedSuggestions.session,
          });
          break;
      }
    },
    [permission, groupedSuggestions]
  );

  const header = `[!] ${permission.toolName}: ${formatToolInput(permission.toolInput)}`;
  const footer = queueCount > 0 ? `(+${queueCount} more pending)` : undefined;

  return (
    <CompactListSelect
      items={items}
      selected=""
      onSelect={handleSelect}
      header={header}
      footer={footer}
      borderColor="yellow"
      multiSelect={false}
    />
  );
};
