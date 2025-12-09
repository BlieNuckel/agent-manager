import React from 'react';
import { Box, Text } from 'ink';
import type { Agent, HistoryEntry, ArtifactInfo } from '../types';
import { Tab } from '../components/Tab';
import { AgentItem } from '../components/AgentItem';
import { HistoryItem } from '../components/HistoryItem';
import { ArtifactItem } from '../components/ArtifactItem';

interface ListViewPageProps {
  tab: 'inbox' | 'history' | 'artifacts';
  agents: Agent[];
  history: HistoryEntry[];
  artifacts: ArtifactInfo[];
  inboxIdx: number;
  histIdx: number;
  artifactsIdx: number;
}

export const ListViewPage = ({ tab, agents, history, artifacts, inboxIdx, histIdx, artifactsIdx }: ListViewPageProps) => {
  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box>
        <Tab label="Inbox" active={tab === 'inbox'} count={agents.length} />
        <Tab label="History" active={tab === 'history'} />
        <Tab label="Artifacts" active={tab === 'artifacts'} count={artifacts.length} />
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
        ) : tab === 'history' ? (
          history.length === 0 ? (
            <Text dimColor>No history yet.</Text>
          ) : (
            history.slice(0, 5).map((h, i) => (
              <HistoryItem key={h.id} entry={h} selected={i === histIdx} />
            ))
          )
        ) : (
          artifacts.length === 0 ? (
            <Text dimColor>No artifacts yet.</Text>
          ) : (
            artifacts.map((a, i) => (
              <ArtifactItem key={a.path} artifact={a} selected={i === artifactsIdx} />
            ))
          )
        )}
      </Box>
    </Box>
  );
};

export const getListViewHelp = (tab: 'inbox' | 'history' | 'artifacts') => {
  return (
    <>
      <Text color="cyan">Tab</Text>{' '}Switch{'  '}
      <Text color="cyan">↑↓jk</Text>{' '}Nav{'  '}
      <Text color="cyan">Enter</Text>{' '}{tab === 'inbox' ? 'Open' : tab === 'history' ? 'Resume' : 'View'}{'  '}
      {tab === 'history' && <><Text color="cyan">e</Text>{' '}Edit{'  '}</>}
      <Text color="cyan">n</Text>{' '}New{'  '}
      {tab === 'inbox' && <><Text color="cyan">x</Text>{' '}Kill{'  '}</>}
      {(tab === 'inbox' || tab === 'history') && <><Text color="cyan">d</Text>{' '}{tab === 'inbox' ? 'Remove' : 'Delete'}{'  '}</>}
      <Text color="cyan">:</Text>{' '}Commands{'  '}
      <Text color="cyan">q</Text>{' '}Quit
    </>
  );
};
