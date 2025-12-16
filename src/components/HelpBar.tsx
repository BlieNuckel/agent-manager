import React, { ReactNode } from 'react';
import { Box, Text } from 'ink';
import { VimCommandInput } from './VimCommandInput';
import { Command } from '../commands/types';

interface HelpBarProps {
  children: ReactNode;
  commandMode?: boolean;
  commands?: Command[];
  onCommandExecute?: (command: Command, args: string[]) => void;
  onCommandCancel?: () => void;
}

export const HelpBar = ({
  children,
  commandMode = false,
  commands = [],
  onCommandExecute,
  onCommandCancel
}: HelpBarProps) => {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
      {commandMode && onCommandExecute && onCommandCancel ? (
        <VimCommandInput
          commands={commands}
          onExecute={onCommandExecute}
          onCancel={onCommandCancel}
        />
      ) : (
        <Text dimColor>
          {children}
        </Text>
      )}
    </Box>
  );
};
