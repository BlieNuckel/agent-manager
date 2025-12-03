import React from 'react';
import { Box, Text } from 'ink';
import type { Mode } from '../types';

export const HelpBar = ({ tab, mode }: { tab: 'inbox' | 'history'; mode: Mode }) => {
  if (mode !== 'normal') return null;
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
      <Text dimColor>
        <Text color="cyan">Tab</Text>{' '}Switch{'  '}
        <Text color="cyan">↑↓jk</Text>{' '}Nav{'  '}
        <Text color="cyan">Enter</Text>{' '}{tab === 'inbox' ? 'Open' : 'Resume'}{'  '}
        <Text color="cyan">n</Text>{' '}New{'  '}
        {tab === 'inbox' && <><Text color="cyan">x</Text>{' '}Kill{'  '}</>}
        <Text color="cyan">d</Text>{' '}{tab === 'inbox' ? 'Remove' : 'Delete'}{'  '}
        <Text color="cyan">q</Text>{' '}Quit
      </Text>
    </Box>
  );
};
