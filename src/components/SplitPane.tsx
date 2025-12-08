import React, { ReactNode } from 'react';
import { Box, useStdout } from 'ink';

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
        const isFirst = index === 0;

        return (
          <Box key={index} width={width} flexDirection="column" flexGrow={0} flexShrink={0} minHeight={0}>
            {isFirst ? (
              pane.content
            ) : (
              <Box flexDirection="column" flexGrow={1} minHeight={0} borderStyle="single" borderColor="gray" borderLeft={true}>
                {pane.content}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
