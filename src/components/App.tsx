import React, { useState, useEffect, useReducer } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Agent, AgentType, HistoryEntry, Mode, PermissionRequest } from '../types';
import { reducer } from '../state/reducer';
import { loadHistory, saveHistory } from '../state/history';
import { AgentSDKManager } from '../agent/manager';
import { getGitRoot, createWorktree, attemptAutoMerge, cleanupWorktree } from '../git/worktree';
import { genId } from '../utils/helpers';
import { debug } from '../utils/logger';
import { Tab } from './Tab';
import { AgentItem } from './AgentItem';
import { HistoryItem } from './HistoryItem';
import { HelpBar } from './HelpBar';
import { PromptInput } from './PromptInput';
import { DetailView } from './DetailView';

const agentManager = new AgentSDKManager();

export const App = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(reducer, { agents: [], history: loadHistory() });
  const [tab, setTab] = useState<'inbox' | 'history'>('inbox');
  const [inboxIdx, setInboxIdx] = useState(0);
  const [histIdx, setHistIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);

  useEffect(() => {
    const onOutput = (id: string, line: string) => dispatch({ type: 'APPEND_OUTPUT', id, line });
    const onDone = (id: string, code: number) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: code === 0 ? 'done' : 'error' } });

      if (code === 0) {
        const agent = state.agents.find(a => a.id === id);
        if (agent?.worktreeName) {
          const gitRoot = getGitRoot();
          if (gitRoot) {
            dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'pending' } });

            const mergeResult = attemptAutoMerge(agent.worktreeName, gitRoot);

            if (mergeResult.success) {
              dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'merged' } });
              dispatch({ type: 'APPEND_OUTPUT', id, line: `[✓] Successfully merged to main branch` });
              cleanupWorktree(agent.worktreeName, gitRoot);
            } else if (mergeResult.conflict) {
              dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'conflict', mergeError: mergeResult.error } });
              dispatch({ type: 'APPEND_OUTPUT', id, line: `[!] Merge conflicts detected - requires manual resolution` });
            } else {
              dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'failed', mergeError: mergeResult.error } });
              dispatch({ type: 'APPEND_OUTPUT', id, line: `[x] Merge failed: ${mergeResult.error}` });
            }
          }
        }
      }
    };
    const onError = (id: string, msg: string) => {
      dispatch({ type: 'APPEND_OUTPUT', id, line: `[x] Error: ${msg}` });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: 'error' } });
    };
    const onSessionId = (id: string, sessionId: string) => {
      dispatch({ type: 'UPDATE_AGENT', id, updates: { sessionId } });
    };
    const onPermissionRequest = (id: string, permission: PermissionRequest) => {
      debug('Permission request received in UI:', { id, toolName: permission.toolName });
      dispatch({ type: 'SET_PERMISSION', id, permission });
      process.stdout.write('\u0007');
    };
    const onTitleUpdate = (id: string, title: string) => {
      debug('Title update received in UI:', { id, title });
      dispatch({ type: 'UPDATE_AGENT_TITLE', id, title });
      dispatch({ type: 'UPDATE_HISTORY_TITLE', id, title });
      const newHistory = state.history.map(h => h.id === id ? { ...h, title } : h);
      saveHistory(newHistory);
    };

    agentManager.on('output', onOutput);
    agentManager.on('done', onDone);
    agentManager.on('error', onError);
    agentManager.on('sessionId', onSessionId);
    agentManager.on('permissionRequest', onPermissionRequest);
    agentManager.on('titleUpdate', onTitleUpdate);

    return () => {
      agentManager.off('output', onOutput);
      agentManager.off('done', onDone);
      agentManager.off('error', onError);
      agentManager.off('sessionId', onSessionId);
      agentManager.off('permissionRequest', onPermissionRequest);
      agentManager.off('titleUpdate', onTitleUpdate);
    };
  }, [state.history]);

  const createAgent = (prompt: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => {
    let workDir = process.cwd();
    let worktreeName: string | undefined;

    if (worktree.enabled) {
      const result = createWorktree(worktree.name);
      if (result.success) {
        workDir = result.path;
        worktreeName = worktree.name;
      }
    }

    const id = genId();
    const title = 'Pending...';
    const agent: Agent = {
      id, title, prompt, status: 'working', output: [], workDir, worktreeName,
      createdAt: new Date(), updatedAt: new Date(),
      agentType,
      autoAcceptPermissions: false,
    };
    dispatch({ type: 'ADD_AGENT', agent });

    agentManager.spawn(id, prompt, workDir, agentType, false);

    const entry: HistoryEntry = { id, title, prompt, date: new Date(), workDir };
    const newHistory = [entry, ...state.history.filter(h => h.prompt !== prompt)].slice(0, 5);
    saveHistory(newHistory);
  };

  const handlePermissionResponse = (allowed: boolean) => {
    debug('handlePermissionResponse called:', { detailAgentId, allowed });
    if (detailAgentId) {
      const agent = state.agents.find(a => a.id === detailAgentId);
      debug('Found agent:', { id: agent?.id, hasPendingPermission: !!agent?.pendingPermission });
      if (agent?.pendingPermission) {
        debug('Resolving permission with:', allowed);
        agent.pendingPermission.resolve(allowed);
        dispatch({ type: 'SET_PERMISSION', id: detailAgentId, permission: undefined });
      }
    }
  };

  const handleAlwaysAllow = () => {
    debug('handleAlwaysAllow called:', { detailAgentId });
    if (detailAgentId) {
      const agent = state.agents.find(a => a.id === detailAgentId);
      if (agent?.pendingPermission) {
        debug('Setting auto-accept for agent:', detailAgentId);
        agent.pendingPermission.resolve(true);
        agentManager.setAutoAccept(detailAgentId, true);
        dispatch({ type: 'UPDATE_AGENT', id: detailAgentId, updates: { autoAcceptPermissions: true } });
        dispatch({ type: 'SET_PERMISSION', id: detailAgentId, permission: undefined });
      }
    }
  };

  useInput((input, key) => {
    if (mode === 'input' || mode === 'detail') return;

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
      } else {
        const entry = state.history[idx] as HistoryEntry;
        createAgent(entry.prompt, 'normal', { enabled: false, name: '' });
        setTab('inbox');
      }
    }

    if (tab === 'inbox' && state.agents[idx]) {
      if (input === 'x') {
        agentManager.kill(state.agents[idx].id);
        dispatch({ type: 'UPDATE_AGENT', id: state.agents[idx].id, updates: { status: 'done' } });
      }
      if (input === 'd') {
        agentManager.kill(state.agents[idx].id);
        dispatch({ type: 'REMOVE_AGENT', id: state.agents[idx].id });
        setInboxIdx(Math.max(0, inboxIdx - 1));
      }
    }

    if (tab === 'history' && state.history[idx]) {
      if (input === 'd') {
        dispatch({ type: 'REMOVE_HISTORY', index: idx });
        const newHistory = state.history.filter((_, i) => i !== idx);
        saveHistory(newHistory);
        setHistIdx(Math.max(0, histIdx - 1));
      }
    }
  });

  const detailAgent = state.agents.find(a => a.id === detailAgentId);

  if (mode === 'detail' && detailAgent) {
    return (
      <DetailView
        agent={detailAgent}
        onBack={() => setMode('normal')}
        onPermissionResponse={handlePermissionResponse}
        onAlwaysAllow={handleAlwaysAllow}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">🤖 Agent Manager</Text>
        <Text dimColor> v2 (SDK)</Text>
        <Text dimColor> • {state.agents.filter(a => a.status === 'working').length} active</Text>
        {state.agents.some(a => a.status === 'waiting') && (
          <Text color="yellow"> • {state.agents.filter(a => a.status === 'waiting').length} waiting</Text>
        )}
      </Box>

      <Box>
        <Tab label="Inbox" active={tab === 'inbox'} count={state.agents.length} />
        <Tab label="History" active={tab === 'history'} />
      </Box>

      <Box flexDirection="column" minHeight={15} marginTop={1}>
        {mode === 'input' ? (
          <PromptInput
            onSubmit={(p, at, wt) => { createAgent(p, at, wt); setMode('normal'); setTab('inbox'); }}
            onCancel={() => setMode('normal')}
          />
        ) : tab === 'inbox' ? (
          state.agents.length === 0 ? (
            <Text dimColor>No active agents. Press 'n' to create one.</Text>
          ) : (
            state.agents.map((a, i) => (
              <AgentItem key={a.id} agent={a} selected={i === inboxIdx} />
            ))
          )
        ) : state.history.length === 0 ? (
          <Text dimColor>No history yet.</Text>
        ) : (
          state.history.slice(0, 5).map((h, i) => (
            <HistoryItem key={h.id} entry={h} selected={i === histIdx} />
          ))
        )}
      </Box>

      <HelpBar tab={tab} mode={mode} />
    </Box>
  );
};
