import React, { ReactNode } from 'react';
import { Box, Text } from 'ink';

interface HelpBarProps {
  children: ReactNode;
}

export const HelpBar = ({ children }: HelpBarProps) => {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
      <Text dimColor>
        {children}
      </Text>
    </Box>
  );
};
