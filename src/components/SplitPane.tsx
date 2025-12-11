import React, { ReactNode } from 'react';
import { Box, Text, useStdout } from 'ink';

interface PaneConfig {
  content: ReactNode;
  widthPercent: number;
}

interface SplitPaneProps {
  panes: PaneConfig[];
}

export const SplitPane = ({ panes }: SplitPaneProps) => {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;

  return (
    <Box flexDirection="row" flexGrow={1} minHeight={0}>
      {panes.map((pane, index) => {
        const width = Math.floor(termWidth * pane.widthPercent / 100);

        return (
          <Box key={index} width={width} flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
            {pane.content}
          </Box>
        );
      })}
    </Box>
  );
};
