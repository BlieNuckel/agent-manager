import React, { useState, useReducer, useEffect } from 'react';
import { useInput, useApp } from 'ink';
import type { Mode, InputStep } from '../types';
import { reducer } from '../state/reducer';
import { mockAgents, mockHistory } from './mockData';
import { Layout } from '../components/Layout';
import { ListViewPage, getListViewHelp, NewAgentPage, getNewAgentHelp, DetailViewPage, getDetailViewHelp } from '../pages';

export const DemoApp = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(reducer, { agents: mockAgents, history: mockHistory });
  const [tab, setTab] = useState<'inbox' | 'history'>('inbox');
  const [inboxIdx, setInboxIdx] = useState(0);
  const [histIdx, setHistIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [inputState, setInputState] = useState<{ step: InputStep; showSlashMenu: boolean }>({ step: 'title', showSlashMenu: false });
  const [demoMode, setDemoMode] = useState<'list' | 'detail' | 'input' | 'cycling'>('list');
  const [cycleState, setCycleState] = useState(0);

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

  const handlePermissionResponse = (allowed: boolean) => {
    if (detailAgentId) {
      const agent = state.agents.find(a => a.id === detailAgentId);
      if (agent?.pendingPermission) {
        agent.pendingPermission.resolve(allowed);
        dispatch({ type: 'SET_PERMISSION', id: detailAgentId, permission: undefined });
      }
    }
  };

  const handleAlwaysAllow = () => {
    if (detailAgentId) {
      const agent = state.agents.find(a => a.id === detailAgentId);
      if (agent?.pendingPermission) {
        agent.pendingPermission.resolve(true);
        dispatch({ type: 'UPDATE_AGENT', id: detailAgentId, updates: { autoAcceptPermissions: true } });
        dispatch({ type: 'SET_PERMISSION', id: detailAgentId, permission: undefined });
      }
    }
  };

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

      return {
        content: (
          <DetailViewPage
            agent={detailAgent}
            onPermissionResponse={handlePermissionResponse}
            onAlwaysAllow={handleAlwaysAllow}
            onQuestionResponse={() => {}}
            onBack={() => setMode('normal')}
          />
        ),
        help: detailAgent.pendingPermission ? null : getDetailViewHelp(promptNeedsScroll, detailAgent.status === 'done', false),
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
          agents={state.agents}
          history={state.history}
          inboxIdx={inboxIdx}
          histIdx={histIdx}
        />
      ),
      help: getListViewHelp(tab),
    };
  };

  const { content, help } = renderPage();

  const demoHelp = `
  ┌────────────────────────────────────────────────────────────────┐
  │ 🎭 DEMO MODE - Navigate pages with number keys:               │
  │  1: List View (Inbox)  2: Detail View  3: History  4: Input   │
  │  c: Toggle auto-cycling through all pages                      │
  │  q: Quit                                                       │
  └────────────────────────────────────────────────────────────────┘
  ${help || ''}
  `.trim();

  return (
    <Layout activeCount={activeCount} waitingCount={waitingCount} helpContent={demoMode === 'cycling' ? `🔄 Auto-cycling through pages... (Press 'c' to stop)` : demoHelp}>
      {content}
    </Layout>
  );
};
