import React, { useState, useReducer, useEffect, useMemo } from 'react';
import { useInput, useApp } from 'ink';
import type { Mode, InputStep, InboxItem } from '../types';
import { reducer } from '../state/reducer';
import { mockAgents, mockHistory } from './mockData';
import { Layout } from '../components/Layout';
import { ListViewPage, getListViewHelp, NewAgentPage, getNewAgentHelp, DetailViewPage, getDetailViewHelp } from '../pages';

export const DemoApp = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(reducer, { agents: mockAgents, history: mockHistory, artifacts: [], templates: [], agentTypes: [], workflows: [], workflowExecutions: [] });
  const [tab, setTab] = useState<'inbox' | 'history' | 'artifacts'>('inbox');
  const [inboxIdx, setInboxIdx] = useState(0);
  const [histIdx, setHistIdx] = useState(0);
  const [artifactsIdx, setArtifactsIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [inputState, setInputState] = useState<{ step: InputStep; showSlashMenu: boolean }>({ step: 'title', showSlashMenu: false });
  const [demoMode, setDemoMode] = useState<'list' | 'detail' | 'input' | 'cycling'>('list');
  const [cycleState, setCycleState] = useState(0);
  const [expandedWorkflows] = useState<Set<string>>(new Set());

  const inboxItems = useMemo((): InboxItem[] => {
    return state.agents.map(agent => ({ type: 'agent' as const, agent }));
  }, [state.agents]);

  useEffect(() => {
    state.agents.forEach(agent => {
      if (agent.pendingPermission) {
        const originalResolve = agent.pendingPermission.resolve;
        agent.pendingPermission.resolve = (result: { allowed: boolean; suggestions?: unknown[] }) => {
          originalResolve(result);
          dispatch({ type: 'DEQUEUE_PERMISSION', id: agent.id });
        };
      }
    });
  }, []);

  useEffect(() => {
    if (demoMode === 'cycling') {
      const timer = setTimeout(() => {
        setCycleState(prev => {
          const next = prev + 1;

          switch (next) {
            case 1:
              setTab('inbox');
              setInboxIdx(0);
              return next;
            case 2:
              setInboxIdx(1);
              return next;
            case 3:
              setDetailAgentId(state.agents[0].id);
              setMode('detail');
              return next;
            case 4:
              setMode('normal');
              setDetailAgentId(null);
              setInboxIdx(2);
              return next;
            case 5:
              setDetailAgentId(state.agents[2].id);
              setMode('detail');
              return next;
            case 6:
              setMode('normal');
              setDetailAgentId(null);
              setTab('history');
              setHistIdx(0);
              return next;
            case 7:
              setHistIdx(1);
              return next;
            case 8:
              setMode('input');
              return next;
            case 9:
              setMode('normal');
              setTab('inbox');
              setInboxIdx(0);
              return 0;
            default:
              return next;
          }
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [demoMode, cycleState, state.agents]);


  useInput((input, key) => {
    if (input === 'c' && mode === 'normal') {
      setDemoMode(prev => prev === 'cycling' ? 'list' : 'cycling');
      setCycleState(0);
      return;
    }

    if (demoMode === 'cycling') {
      return;
    }

    if (mode === 'detail') {
      if (key.escape || input === 'q') {
        setMode('normal');
        return;
      }
      return;
    }

    if (mode === 'input') {
      if (key.escape) {
        setMode('normal');
        return;
      }
      return;
    }

    if (key.tab) { setTab(t => t === 'inbox' ? 'history' : 'inbox'); return; }
    if (input === 'q') { exit(); return; }
    if (input === 'n') { setMode('input'); return; }

    const list = tab === 'inbox' ? state.agents : state.history;
    const idx = tab === 'inbox' ? inboxIdx : histIdx;
    const setIdx = tab === 'inbox' ? setInboxIdx : setHistIdx;

    if ((key.upArrow || input === 'k') && idx > 0) setIdx(idx - 1);
    if ((key.downArrow || input === 'j') && idx < list.length - 1) setIdx(idx + 1);

    if (key.return && list[idx]) {
      if (tab === 'inbox') {
        setDetailAgentId(state.agents[idx].id);
        setMode('detail');
      }
    }

    if (input === '1') {
      setTab('inbox');
      setInboxIdx(0);
      setMode('normal');
      setDetailAgentId(null);
    }
    if (input === '2') {
      setTab('inbox');
      setInboxIdx(0);
      setDetailAgentId(state.agents[0].id);
      setMode('detail');
    }
    if (input === '3') {
      setTab('history');
      setHistIdx(0);
      setMode('normal');
      setDetailAgentId(null);
    }
    if (input === '4') {
      setMode('input');
      setTab('inbox');
    }
  });

  const detailAgent = state.agents.find(a => a.id === detailAgentId);
  const activeCount = state.agents.filter(a => a.status === 'working').length;
  const waitingCount = state.agents.filter(a => a.status === 'waiting').length;

  const renderPage = () => {
    if (mode === 'detail' && detailAgent) {
      const promptLines = detailAgent.prompt.split('\n');
      const promptNeedsScroll = promptLines.length > 10;

      const listContent = (
        <ListViewPage
          tab={tab}
          inboxItems={inboxItems}
          history={state.history}
          artifacts={state.artifacts}
          inboxIdx={inboxIdx}
          histIdx={histIdx}
          artifactsIdx={artifactsIdx}
          expandedWorkflows={expandedWorkflows}
        />
      );

      const detailContent = (
        <DetailViewPage
          agent={detailAgent}
          onQuestionResponse={() => {}}
          onBack={() => setMode('normal')}
        />
      );

      return {
        splitPanes: [
          { content: listContent, widthPercent: 40 },
          { content: detailContent, widthPercent: 60 }
        ],
        help: getDetailViewHelp(promptNeedsScroll, detailAgent.status === 'done', false, undefined, !!detailAgent.pendingPermission, !!detailAgent.pendingQuestion),
      };
    }

    if (mode === 'input') {
      return {
        content: (
          <NewAgentPage
            onSubmit={(title, prompt, agentType, worktree) => { setMode('normal'); setTab('inbox'); }}
            onCancel={() => setMode('normal')}
            onStateChange={setInputState}
          />
        ),
        help: getNewAgentHelp(inputState.step, inputState.showSlashMenu),
      };
    }

    return {
      content: (
        <ListViewPage
          tab={tab}
          inboxItems={inboxItems}
          history={state.history}
          artifacts={state.artifacts}
          inboxIdx={inboxIdx}
          histIdx={histIdx}
          artifactsIdx={artifactsIdx}
          expandedWorkflows={expandedWorkflows}
        />
      ),
      help: getListViewHelp(tab),
    };
  };

  const { content, help, splitPanes } = renderPage();

  return (
    <Layout
      activeCount={activeCount}
      waitingCount={waitingCount}
      helpContent={demoMode === 'cycling' ? `🔄 Auto-cycling through pages... (Press 'c' to stop)` : help}
      splitPanes={splitPanes}
    >
      {content}
    </Layout>
  );
};
