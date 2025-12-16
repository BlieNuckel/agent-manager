import React, { ReactNode } from 'react';
import { Box, useStdout } from 'ink';
import { Header } from './Header';
import { HelpBar } from './HelpBar';
import { SplitPane } from './SplitPane';
import { Command } from '../commands/types';

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
  quitPrompt?: ReactNode;
  deletePrompt?: ReactNode;
  artifactDeletePrompt?: ReactNode;
  workflowDeletePrompt?: ReactNode;
  hoverWindows?: ReactNode;
  commandMode?: boolean;
  commands?: Command[];
  onCommandExecute?: (command: Command, args: string[]) => void;
  onCommandCancel?: () => void;
}

export const Layout = ({
  activeCount,
  waitingCount,
  helpContent,
  children,
  splitPanes,
  quitPrompt,
  deletePrompt,
  artifactDeletePrompt,
  workflowDeletePrompt,
  hoverWindows,
  commandMode,
  commands,
  onCommandExecute,
  onCommandCancel
}: LayoutProps) => {
  const { stdout } = useStdout();
  const height = stdout?.rows ?? 24;

  return (
    <Box height={height} position="relative">
      <Box flexDirection="column" height={height} width="100%">
        <Box flexShrink={0}>
          <Header activeCount={activeCount} waitingCount={waitingCount} />
        </Box>

        <Box flexDirection="column" flexGrow={1} minHeight={0} overflow="hidden">
          {splitPanes ? (
            <SplitPane panes={splitPanes} />
          ) : (
            children
          )}
        </Box>

        {quitPrompt && (
          <Box flexShrink={0}>
            {quitPrompt}
          </Box>
        )}

        {deletePrompt && (
          <Box flexShrink={0}>
            {deletePrompt}
          </Box>
        )}

        {artifactDeletePrompt && (
          <Box flexShrink={0}>
            {artifactDeletePrompt}
          </Box>
        )}

        {workflowDeletePrompt && (
          <Box flexShrink={0}>
            {workflowDeletePrompt}
          </Box>
        )}

        <Box flexShrink={0}>
          <HelpBar
            commandMode={commandMode}
            commands={commands}
            onCommandExecute={onCommandExecute}
            onCommandCancel={onCommandCancel}
          >
            {helpContent}
          </HelpBar>
        </Box>
      </Box>
      {hoverWindows}
    </Box>
  );
};
