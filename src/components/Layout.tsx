import React, { ReactNode } from 'react';
import { Box, useStdout } from 'ink';
import { Header } from './Header';
import { HelpBar } from './HelpBar';
import { SplitPane } from './SplitPane';

interface PaneConfig {
  content: ReactNode;
  widthPercent: number;
}

interface LayoutProps {
  activeCount: number;
  waitingCount: number;
  helpContent: ReactNode;
  children?: ReactNode;
  splitPanes?: PaneConfig[];
}

export const Layout = ({ activeCount, waitingCount, helpContent, children, splitPanes }: LayoutProps) => {
  const { stdout } = useStdout();
  const height = stdout?.rows ?? 24;

  return (
    <Box flexDirection="column" height={height}>
      <Box flexShrink={0}>
        <Header activeCount={activeCount} waitingCount={waitingCount} />
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {splitPanes ? (
          <SplitPane panes={splitPanes} />
        ) : (
          children
        )}
      </Box>

      <Box flexShrink={0}>
        <HelpBar>{helpContent}</HelpBar>
      </Box>
    </Box>
  );
};
