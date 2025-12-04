import React from 'react';
import { Box, Text } from 'ink';
import type { Agent, HistoryEntry, AgentType, Mode, InputStep } from '../types';
import { Tab } from './Tab';
import { AgentItem } from './AgentItem';
import { HistoryItem } from './HistoryItem';
import { PromptInput } from './PromptInput';

interface BodyProps {
  tab: 'inbox' | 'history';
  mode: Mode;
  agents: Agent[];
  history: HistoryEntry[];
  inboxIdx: number;
  histIdx: number;
  onSubmit: (title: string, prompt: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => void;
  onCancel: () => void;
  onInputStateChange?: (state: { step: InputStep; showSlashMenu: boolean }) => void;
}

export const Body = ({ tab, mode, agents, history, inboxIdx, histIdx, onSubmit, onCancel, onInputStateChange }: BodyProps) => {
  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box>
        <Tab label="Inbox" active={tab === 'inbox'} count={agents.length} />
        <Tab label="History" active={tab === 'history'} />
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {mode === 'input' ? (
          <PromptInput
            onSubmit={onSubmit}
            onCancel={onCancel}
            onStateChange={onInputStateChange}
          />
        ) : tab === 'inbox' ? (
          agents.length === 0 ? (
            <Text dimColor>No active agents. Press 'n' to create one.</Text>
          ) : (
            agents.map((a, i) => (
              <AgentItem key={a.id} agent={a} selected={i === inboxIdx} />
            ))
          )
        ) : history.length === 0 ? (
          <Text dimColor>No history yet.</Text>
        ) : (
          history.slice(0, 5).map((h, i) => (
            <HistoryItem key={h.id} entry={h} selected={i === histIdx} />
          ))
        )}
      </Box>
    </Box>
  );
};
