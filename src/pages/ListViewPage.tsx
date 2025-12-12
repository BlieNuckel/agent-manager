import React from 'react';
import { Box, Text } from 'ink';
import type { HistoryEntry, ArtifactInfo, InboxItem } from '../types';
import { Tab } from '../components/Tab';
import { AgentItem } from '../components/AgentItem';
import { HistoryItem } from '../components/HistoryItem';
import { ArtifactItem } from '../components/ArtifactItem';
import { WorkflowItem } from '../components/WorkflowItem';

interface ListViewPageProps {
  tab: 'inbox' | 'history' | 'artifacts';
  inboxItems: InboxItem[];
  history: HistoryEntry[];
  artifacts: ArtifactInfo[];
  inboxIdx: number;
  histIdx: number;
  artifactsIdx: number;
  expandedWorkflows: Set<string>;
}

export const ListViewPage = ({ tab, inboxItems, history, artifacts, inboxIdx, histIdx, artifactsIdx, expandedWorkflows }: ListViewPageProps) => {
  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box>
        <Tab label="Inbox" active={tab === 'inbox'} count={inboxItems.length} />
        <Tab label="Artifacts" active={tab === 'artifacts'} count={artifacts.length} />
        <Tab label="History" active={tab === 'history'} />
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {tab === 'inbox' ? (
          inboxItems.length === 0 ? (
            <Text dimColor>No active agents. Press 'n' to create one, or 'w' for a workflow.</Text>
          ) : (
            inboxItems.map((item, i) => {
              if (item.type === 'workflow') {
                return (
                  <WorkflowItem
                    key={`workflow-${item.execution.workflowId}`}
                    workflow={item.workflow}
                    execution={item.execution}
                    expanded={expandedWorkflows.has(item.execution.workflowId)}
                    selected={i === inboxIdx}
                  />
                );
              } else {
                return (
                  <AgentItem
                    key={item.agent.id}
                    agent={item.agent}
                    selected={i === inboxIdx}
                    isWorkflowChild={item.isWorkflowChild}
                  />
                );
              }
            })
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
            <Text dimColor>No artifacts yet. Press 'a' to create one from a template.</Text>
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
      <Text color="cyan">Tab/Shift+Tab</Text>{' '}Switch{'  '}
      <Text color="cyan">↑↓jk</Text>{' '}Nav{'  '}
      <Text color="cyan">Enter</Text>{' '}{tab === 'inbox' ? 'Open' : tab === 'history' ? 'Resume' : 'View'}{'  '}
      {tab === 'inbox' && <><Text color="cyan">Space</Text>{' '}Expand{'  '}</>}
      {tab === 'history' && <><Text color="cyan">e</Text>{' '}Edit{'  '}</>}
      {tab === 'artifacts' && <><Text color="cyan">s</Text>{' '}Spawn{'  '}<Text color="cyan">a</Text>{' '}Add{'  '}</>}
      <Text color="cyan">n</Text>{' '}New{'  '}
      <Text color="cyan">w</Text>{' '}Workflow{'  '}
      {tab === 'inbox' && <><Text color="cyan">x</Text>{' '}Kill{'  '}</>}
      {(tab === 'inbox' || tab === 'history' || tab === 'artifacts') && <><Text color="cyan">d</Text>{' '}{tab === 'inbox' ? 'Remove' : 'Delete'}{'  '}</>}
      <Text color="cyan">:</Text>{' '}Commands{'  '}
      <Text color="cyan">q</Text>{' '}Quit
    </>
  );
};
