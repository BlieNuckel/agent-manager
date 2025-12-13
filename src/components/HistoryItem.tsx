import React from 'react';
import { Box, Text } from 'ink';
import type { HistoryEntry } from '../types';
import { formatTimeAgo } from '../utils/helpers';

export const HistoryItem = React.memo(({ entry, selected }: { entry: HistoryEntry; selected: boolean }) => (
  <Box>
    <Text color={selected ? 'cyan' : 'white'} bold={selected}>{selected ? '> ' : '  '}</Text>
    <Box width={35}><Text bold={selected} color={selected ? 'cyan' : 'white'}>{entry.title}</Text></Box>
    <Box width={12}><Text dimColor>{formatTimeAgo(entry.date)}</Text></Box>
    <Text dimColor wrap="truncate">{entry.prompt.replace(/\n/g, ' ').slice(0, 30)}...</Text>
  </Box>
));
