import React from 'react';
import { Box, Text } from 'ink';
import type { Mode, InputStep } from '../types';

export const HelpBar = ({ tab, mode, inputStep, showSlashMenu }: {
  tab: 'inbox' | 'history';
  mode: Mode;
  inputStep?: InputStep;
  showSlashMenu?: boolean;
}) => {
  if (mode === 'detail') return null;

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
      <Text dimColor>
        {mode === 'input' && showSlashMenu ? (
          <>
            <Text color="cyan">↑↓</Text> Navigate{' '}
            <Text color="cyan">Enter</Text> Select{' '}
            <Text color="cyan">Esc</Text> Cancel{' '}
            <Text color="cyan">Type</Text> Search
          </>
        ) : mode === 'input' && inputStep === 'prompt' ? (
          <>
            <Text color="cyan">Enter</Text> Continue{' '}
            <Text color="cyan">Shift+Enter</Text> New Line{' '}
            <Text color="cyan">Ctrl+G</Text> Edit in Vim{' '}
            <Text color="cyan">/</Text> Slash Commands{' '}
            <Text color="cyan">Esc</Text> Cancel
          </>
        ) : mode === 'input' && inputStep === 'agentType' ? (
          <>
            <Text color="cyan">1-3</Text> Select Type{' '}
            <Text color="cyan">Enter</Text> Continue{' '}
            <Text color="cyan">←</Text> Back{' '}
            <Text color="cyan">Esc</Text> Cancel
          </>
        ) : mode === 'input' && inputStep === 'worktree' ? (
          <>
            <Text color="cyan">Y/N</Text> Choose{' '}
            <Text color="cyan">Enter</Text> Continue{' '}
            <Text color="cyan">←</Text> Back{' '}
            <Text color="cyan">Esc</Text> Cancel
          </>
        ) : mode === 'input' && inputStep === 'worktreeName' ? (
          <>
            <Text color="cyan">Enter</Text> Submit{' '}
            <Text color="cyan">←</Text> Back{' '}
            <Text color="cyan">Esc</Text> Cancel
          </>
        ) : (
          <>
            <Text color="cyan">Tab</Text>{' '}Switch{'  '}
            <Text color="cyan">↑↓jk</Text>{' '}Nav{'  '}
            <Text color="cyan">Enter</Text>{' '}{tab === 'inbox' ? 'Open' : 'Resume'}{'  '}
            <Text color="cyan">n</Text>{' '}New{'  '}
            {tab === 'inbox' && <><Text color="cyan">x</Text>{' '}Kill{'  '}</>}
            <Text color="cyan">d</Text>{' '}{tab === 'inbox' ? 'Remove' : 'Delete'}{'  '}
            <Text color="cyan">q</Text>{' '}Quit
          </>
        )}
      </Text>
    </Box>
  );
};
