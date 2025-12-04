import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest } from '../types';
import { formatToolInput } from '../utils/helpers';

export const PermissionPrompt = ({ permission, onResponse, onAlwaysAllow }: {
  permission: PermissionRequest;
  onResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
}) => {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.leftArrow || input === 'h') setSelected(s => Math.max(0, s - 1));
    if (key.rightArrow || input === 'l') setSelected(s => Math.min(2, s + 1));
    if (input === 'y' || input === 'Y') { onResponse(true); return; }
    if (input === 'n' || input === 'N') { onResponse(false); return; }
    if (input === 'a' || input === 'A') { onAlwaysAllow(); return; }
    if (key.return) {
      if (selected === 0) onResponse(true);
      else if (selected === 1) onResponse(false);
      else onAlwaysAllow();
      return;
    }
  });

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
        <Box paddingX={2} flexShrink={0} borderStyle={selected === 0 ? 'bold' : 'single'} borderColor={selected === 0 ? 'green' : 'gray'}>
          <Text color={selected === 0 ? 'green' : 'white'} bold={selected === 0}>[Y]es</Text>
        </Box>
        <Box paddingX={2} flexShrink={0} borderStyle={selected === 1 ? 'bold' : 'single'} borderColor={selected === 1 ? 'red' : 'gray'}>
          <Text color={selected === 1 ? 'red' : 'white'} bold={selected === 1}>[N]o</Text>
        </Box>
        <Box paddingX={2} flexShrink={0} borderStyle={selected === 2 ? 'bold' : 'single'} borderColor={selected === 2 ? 'yellow' : 'gray'}>
          <Text color={selected === 2 ? 'yellow' : 'white'} bold={selected === 2}>[A]lways</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>←/→ to select • y/n/a or Enter to confirm</Text>
      </Box>
    </Box>
  );
};
