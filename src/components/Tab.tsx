import React from 'react';
import { Box, Text } from 'ink';

export const Tab = ({ label, active, count }: { label: string; active: boolean; count?: number }) => (
  <Box paddingX={2} borderStyle={active ? 'bold' : 'single'} borderColor={active ? 'cyan' : 'gray'}>
    <Text bold={active} color={active ? 'cyan' : 'gray'}>
      {label}{count !== undefined ? ` (${count})` : ''}
    </Text>
  </Box>
);
