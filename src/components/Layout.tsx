import React, { ReactNode } from 'react';
import { Box, useStdout } from 'ink';
import { Header } from './Header';
import { HelpBar } from './HelpBar';

interface LayoutProps {
  activeCount: number;
  waitingCount: number;
  helpContent: ReactNode;
  children: ReactNode;
}

export const Layout = ({ activeCount, waitingCount, helpContent, children }: LayoutProps) => {
  const { stdout } = useStdout();
  const height = stdout?.rows ?? 24;

  return (
    <Box flexDirection="column" height={height}>
      <Box flexShrink={0}>
        <Header activeCount={activeCount} waitingCount={waitingCount} />
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {children}
      </Box>

      <Box flexShrink={0}>
        <HelpBar>{helpContent}</HelpBar>
      </Box>
    </Box>
  );
};
