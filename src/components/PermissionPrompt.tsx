import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest } from '../types';
import { formatToolInput } from '../utils/helpers';
import { AUTO_ACCEPT_EDIT_TOOLS } from '../agent/manager';

export const PermissionPrompt = ({ permission, onResponse, onAlwaysAllow, onAlwaysAllowInRepo }: {
  permission: PermissionRequest;
  onResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
  onAlwaysAllowInRepo?: () => void;
}) => {
  const isEditTool = AUTO_ACCEPT_EDIT_TOOLS.includes(permission.toolName);
  const hasSuggestions = permission.suggestions && permission.suggestions.length > 0;

  const options = useMemo(() => {
    const opts: Array<'yes' | 'no' | 'always' | 'repo'> = ['yes', 'no'];
    if (isEditTool) opts.push('always');
    if (hasSuggestions && onAlwaysAllowInRepo) opts.push('repo');
    return opts;
  }, [isEditTool, hasSuggestions, onAlwaysAllowInRepo]);

  const [selected, setSelected] = useState(0);
  const maxOption = options.length - 1;

  useInput((input, key) => {
    if (key.leftArrow || input === 'h') setSelected(s => Math.max(0, s - 1));
    if (key.rightArrow || input === 'l') setSelected(s => Math.min(maxOption, s + 1));
    if (input === 'y' || input === 'Y') { onResponse(true); return; }
    if (input === 'n' || input === 'N') { onResponse(false); return; }
    if (isEditTool && (input === 'a' || input === 'A')) { onAlwaysAllow(); return; }
    if (hasSuggestions && onAlwaysAllowInRepo && (input === 'r' || input === 'R')) { onAlwaysAllowInRepo(); return; }
    if (key.return) {
      const currentOption = options[selected];
      if (currentOption === 'yes') onResponse(true);
      else if (currentOption === 'no') onResponse(false);
      else if (currentOption === 'always') onAlwaysAllow();
      else if (currentOption === 'repo') onAlwaysAllowInRepo?.();
      return;
    }
  });

  const getButtonConfig = (option: 'yes' | 'no' | 'always' | 'repo', index: number) => {
    const isSelected = selected === index;
    switch (option) {
      case 'yes':
        return { label: '[Y]es', color: 'green' as const };
      case 'no':
        return { label: '[N]o', color: 'red' as const };
      case 'always':
        return { label: '[A]lways (auto-accept edits)', color: 'yellow' as const };
      case 'repo':
        return { label: '[R]epo', color: 'blue' as const };
    }
  };

  const getShortcutHint = () => {
    let hint = 'y/n';
    if (isEditTool) hint += '/a';
    if (hasSuggestions && onAlwaysAllowInRepo) hint += '/r';
    return hint;
  };

  return (
    <Box flexDirection="column" flexShrink={0} borderStyle="round" borderColor="yellow" padding={1}>
      <Text color="yellow" bold>[!] Permission Request</Text>
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
      {hasSuggestions && onAlwaysAllowInRepo && (
        <Box>
          <Text dimColor italic>[R]epo saves to .claude/settings.local.json</Text>
        </Box>
      )}
    </Box>
  );
};
