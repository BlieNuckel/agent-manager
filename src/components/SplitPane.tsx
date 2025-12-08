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
        const isFirst = index === 0;
        const isLast = index === panes.length - 1;

        return (
          <React.Fragment key={index}>
            {!isFirst && (
              <Box width={1} flexDirection="column" flexGrow={0} flexShrink={0}>
                <Text color="gray">│</Text>
              </Box>
            )}
            <Box width={isFirst ? width : width - 1} flexDirection="column" flexGrow={0} flexShrink={0} minHeight={0}>
              {pane.content}
            </Box>
          </React.Fragment>
        );
      })}
    </Box>
  );
};
