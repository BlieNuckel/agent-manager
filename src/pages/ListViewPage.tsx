import React from 'react';
import { Box, Text } from 'ink';
import type { Agent, HistoryEntry } from '../types';
import { Tab } from '../components/Tab';
import { AgentItem } from '../components/AgentItem';
import { HistoryItem } from '../components/HistoryItem';

interface ListViewPageProps {
  tab: 'inbox' | 'history';
  agents: Agent[];
  history: HistoryEntry[];
  inboxIdx: number;
  histIdx: number;
}

export const ListViewPage = ({ tab, agents, history, inboxIdx, histIdx }: ListViewPageProps) => {
  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box>
        <Tab label="Inbox" active={tab === 'inbox'} count={agents.length} />
        <Tab label="History" active={tab === 'history'} />
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {tab === 'inbox' ? (
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

export const getListViewHelp = (tab: 'inbox' | 'history') => {
  return (
    <>
      <Text color="cyan">Tab</Text>{' '}Switch{'  '}
      <Text color="cyan">↑↓jk</Text>{' '}Nav{'  '}
      <Text color="cyan">Enter</Text>{' '}{tab === 'inbox' ? 'Open' : 'Resume'}{'  '}
      {tab === 'history' && <><Text color="cyan">e</Text>{' '}Edit{'  '}</>}
      <Text color="cyan">n</Text>{' '}New{'  '}
      {tab === 'inbox' && <><Text color="cyan">x</Text>{' '}Kill{'  '}</>}
      <Text color="cyan">d</Text>{' '}{tab === 'inbox' ? 'Remove' : 'Delete'}{'  '}
      <Text color="cyan">q</Text>{' '}Quit
    </>
  );
};
