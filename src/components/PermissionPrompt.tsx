import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest } from '../types';
import { formatToolInput } from '../utils/helpers';
import { AUTO_ACCEPT_EDIT_TOOLS } from '../agent/manager';
import { getPermissionExplanation, getAlwaysAllowExplanation } from '../utils/permissions';

export const PermissionPrompt = ({ permission, onResponse, onAlwaysAllow, onAlwaysAllowInRepo, queueCount = 0 }: {
  permission: PermissionRequest;
  onResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
  onAlwaysAllowInRepo?: () => void;
  queueCount?: number;
}) => {
  const isEditTool = AUTO_ACCEPT_EDIT_TOOLS.includes(permission.toolName);
  const hasSuggestions = permission.suggestions && permission.suggestions.length > 0;
  const isUserSettings = hasSuggestions && permission.suggestions![0].destination === 'globalSettings';
  const repoExplanation = getPermissionExplanation(permission.suggestions, permission.toolName, permission.toolInput);
  const alwaysExplanation = getAlwaysAllowExplanation(permission.toolName);

  const options = useMemo(() => {
    const opts: Array<'yes' | 'no' | 'always' | 'repo' | 'user'> = ['yes', 'no'];
    if (isEditTool) opts.push('always');
    if (hasSuggestions && onAlwaysAllowInRepo) opts.push(isUserSettings ? 'user' : 'repo');
    return opts;
  }, [isEditTool, hasSuggestions, onAlwaysAllowInRepo, isUserSettings]);

  const [selected, setSelected] = useState(0);
  const maxOption = options.length - 1;

  useInput((input, key) => {
    if (key.leftArrow || input === 'h') setSelected(s => Math.max(0, s - 1));
    if (key.rightArrow || input === 'l') setSelected(s => Math.min(maxOption, s + 1));
    if (input === 'y' || input === 'Y') { onResponse(true); return; }
    if (input === 'n' || input === 'N') { onResponse(false); return; }
    if (isEditTool && (input === 'a' || input === 'A')) { onAlwaysAllow(); return; }
    if (hasSuggestions && onAlwaysAllowInRepo && !isUserSettings && (input === 'r' || input === 'R')) { onAlwaysAllowInRepo(); return; }
    if (hasSuggestions && onAlwaysAllowInRepo && isUserSettings && (input === 'u' || input === 'U')) { onAlwaysAllowInRepo(); return; }
    if (key.return) {
      const currentOption = options[selected];
      if (currentOption === 'yes') onResponse(true);
      else if (currentOption === 'no') onResponse(false);
      else if (currentOption === 'always') onAlwaysAllow();
      else if (currentOption === 'repo' || currentOption === 'user') onAlwaysAllowInRepo?.();
      return;
    }
  });

  const getButtonConfig = (option: 'yes' | 'no' | 'always' | 'repo' | 'user', index: number) => {
    const isSelected = selected === index;
    switch (option) {
      case 'yes':
        return { label: '[Y]es', color: 'green' as const, description: 'Allow this once' };
      case 'no':
        return { label: '[N]o', color: 'red' as const, description: 'Deny this once' };
      case 'always':
        return { label: '[A]lways', color: 'yellow' as const, description: 'Auto-accept edits this session' };
      case 'repo':
        return { label: '[R]epo', color: 'blue' as const, description: 'Save to repo settings' };
      case 'user':
        return { label: '[U]ser', color: 'blue' as const, description: 'Save to user settings' };
    }
  };

  const getShortcutHint = () => {
    let hint = 'y/n';
    if (isEditTool) hint += '/a';
    if (hasSuggestions && onAlwaysAllowInRepo) hint += isUserSettings ? '/u' : '/r';
    return hint;
  };

  return (
    <Box flexDirection="column" flexShrink={0} borderStyle="round" borderColor="yellow" padding={1}>
      <Box>
        <Text color="yellow" bold>[!] Permission Request</Text>
        {queueCount > 0 && <Text dimColor> (+{queueCount} more pending)</Text>}
      </Box>
      <Box marginTop={1}>
        <Text>Tool: </Text>
        <Text color="cyan" bold>{permission.toolName}</Text>
      </Box>
      <Box>
        <Text dimColor>Input: {formatToolInput(permission.toolInput)}</Text>
      </Box>
      <Box marginTop={1} gap={2} flexShrink={0}>
        {options.map((option, index) => {
          const config = getButtonConfig(option, index);
          const isSelected = selected === index;
          return (
            <Box key={option} paddingX={2} flexShrink={0} borderStyle={isSelected ? 'bold' : 'single'} borderColor={isSelected ? config.color : 'gray'}>
              <Text color={isSelected ? config.color : 'white'} bold={isSelected}>{config.label}</Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>←/→ to select • {getShortcutHint()} or Enter to confirm</Text>
      </Box>

      {isEditTool && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="yellow" bold>[A]lways:</Text>
          <Text dimColor>{alwaysExplanation}</Text>
        </Box>
      )}

      {hasSuggestions && onAlwaysAllowInRepo && repoExplanation && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="blue" bold>{isUserSettings ? '[U]ser' : '[R]epo'}: Save to {repoExplanation.saveLocation}</Text>
          <Box>
            <Text dimColor>• Rule: </Text>
            <Text color="cyan">{repoExplanation.whatWillBeSaved}</Text>
          </Box>
          <Text dimColor>• {repoExplanation.futureBeha}</Text>
        </Box>
      )}
    </Box>
  );
};
