import React, { useState, useEffect, useReducer } from 'react';
import { Box, useInput, useApp, useStdout } from 'ink';
import type { Agent, AgentType, HistoryEntry, Mode, PermissionRequest, InputStep } from '../types';
import { reducer } from '../state/reducer';
import { loadHistory, saveHistory } from '../state/history';
import { AgentSDKManager } from '../agent/manager';
import { getGitRoot, createWorktreeWithAgent, attemptAutoMergeWithAgent } from '../git/worktree';
import { genId } from '../utils/helpers';
import { debug } from '../utils/logger';
import { Header } from './Header';
import { Body } from './Body';
import { HelpBar } from './HelpBar';
import { DetailView } from './DetailView';

const agentManager = new AgentSDKManager();

export const App = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [state, dispatch] = useReducer(reducer, { agents: [], history: loadHistory() });
  const [tab, setTab] = useState<'inbox' | 'history'>('inbox');
  const [inboxIdx, setInboxIdx] = useState(0);
  const [histIdx, setHistIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [height, setHeight] = useState(stdout?.rows ?? 24);
  const [inputState, setInputState] = useState<{ step: InputStep; showSlashMenu: boolean }>({ step: 'prompt', showSlashMenu: false });

  useEffect(() => {
    const onOutput = (id: string, line: string) => dispatch({ type: 'APPEND_OUTPUT', id, line });
    const onDone = async (id: string, code: number) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: code === 0 ? 'done' : 'error' } });

      if (code === 0) {
        const agent = state.agents.find(a => a.id === id);
        if (agent?.worktreeName) {
          const gitRoot = getGitRoot();
          if (gitRoot) {
            dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'pending' } });
            dispatch({ type: 'APPEND_OUTPUT', id, line: `[>] Checking if branch can be merged...` });

            try {
              const mergeResult = await attemptAutoMergeWithAgent(agent.worktreeName, gitRoot, false);

              if (mergeResult.needsConfirmation) {
                dispatch({ type: 'APPEND_OUTPUT', id, line: `[!] Branch is ready to merge - awaiting confirmation` });
                dispatch({
                  type: 'SET_MERGE_CONFIRMATION', id, confirmation: {
                    worktreeName: agent.worktreeName,
                    gitRoot,
                    resolve: async (confirmed: boolean) => {
                      dispatch({ type: 'SET_MERGE_CONFIRMATION', id, confirmation: undefined });

                      if (confirmed) {
                        dispatch({ type: 'APPEND_OUTPUT', id, line: `[>] Merging branch...` });
                        const finalMerge = await attemptAutoMergeWithAgent(agent.worktreeName!, gitRoot, true);

                        if (finalMerge.success) {
                          dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'merged' } });
                          dispatch({ type: 'APPEND_OUTPUT', id, line: `[✓] Successfully merged and cleaned up` });
                        } else {
                          dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'failed', mergeError: finalMerge.error } });
                          dispatch({ type: 'APPEND_OUTPUT', id, line: `[x] Merge failed: ${finalMerge.error}` });
                        }
                      } else {
                        dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'pending' } });
                        dispatch({ type: 'APPEND_OUTPUT', id, line: `[-] Merge cancelled by user` });
                      }
                    }
                  }
                });
              } else if (mergeResult.conflict) {
                dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'conflict', mergeError: mergeResult.error } });
                dispatch({ type: 'APPEND_OUTPUT', id, line: `[!] Merge conflicts detected - requires manual resolution` });
              } else if (mergeResult.error) {
                dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'failed', mergeError: mergeResult.error } });
                dispatch({ type: 'APPEND_OUTPUT', id, line: `[x] Merge check failed: ${mergeResult.error}` });
              }
            } catch (e: any) {
              dispatch({ type: 'UPDATE_AGENT', id, updates: { mergeStatus: 'failed', mergeError: e.message } });
              dispatch({ type: 'APPEND_OUTPUT', id, line: `[x] Merge error: ${e.message}` });
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

    const onResize = () => setHeight(process.stdout.rows);
    process.stdout.on('resize', onResize);

    return () => {
      agentManager.off('output', onOutput);
      agentManager.off('done', onDone);
      agentManager.off('error', onError);
      agentManager.off('sessionId', onSessionId);
      agentManager.off('permissionRequest', onPermissionRequest);
      agentManager.off('titleUpdate', onTitleUpdate);
      process.stdout.off('resize', onResize);
    };
  }, [state.history]);

  const createAgent = async (prompt: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => {
    const id = genId();
    let workDir = process.cwd();
    let worktreeName: string | undefined;

    if (worktree.enabled) {
      debug('Creating worktree for prompt:', prompt);

      const placeholderAgent: Agent = {
        id,
        title: 'Creating worktree...',
        prompt,
        status: 'working',
        output: ['[>] Creating git worktree...'],
        workDir,
        worktreeName: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        agentType,
        autoAcceptPermissions: false,
      };
      dispatch({ type: 'ADD_AGENT', agent: placeholderAgent });

      try {
        const result = await createWorktreeWithAgent(prompt, worktree.name || undefined);
        debug('Worktree creation result:', result);

        if (result.success) {
          workDir = result.path;
          worktreeName = result.name;
          debug('Worktree created successfully:', { workDir, worktreeName });

          dispatch({
            type: 'UPDATE_AGENT', id, updates: {
              title: 'Pending...',
              workDir,
              worktreeName,
            }
          });
          dispatch({ type: 'APPEND_OUTPUT', id, line: `[✓] Worktree created: ${worktreeName} at ${workDir}` });
          dispatch({ type: 'APPEND_OUTPUT', id, line: `[>] Starting agent...` });
        } else {
          debug('Failed to create worktree:', result.error);
          dispatch({
            type: 'UPDATE_AGENT', id, updates: {
              title: 'Worktree creation failed',
              status: 'error',
            }
          });
          dispatch({ type: 'APPEND_OUTPUT', id, line: `[x] Failed to create worktree: ${result.error}` });
          return;
        }
      } catch (error: any) {
        debug('Exception while creating worktree:', error.message, error.stack);
        dispatch({
          type: 'UPDATE_AGENT', id, updates: {
            title: 'Worktree creation error',
            status: 'error',
          }
        });
        dispatch({ type: 'APPEND_OUTPUT', id, line: `[x] Exception: ${error.message}` });
        return;
      }
    } else {
      const placeholderAgent: Agent = {
        id,
        title: 'Pending...',
        prompt,
        status: 'working',
        output: [],
        workDir,
        worktreeName: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        agentType,
        autoAcceptPermissions: false,
      };
      dispatch({ type: 'ADD_AGENT', agent: placeholderAgent });
    }

    debug('Spawning agent:', { id, workDir, agentType });
    agentManager.spawn(id, prompt, workDir, agentType, false);

    const entry: HistoryEntry = { id, title: 'Pending...', prompt, date: new Date(), workDir };
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

  const handleMergeConfirmationResponse = (confirmed: boolean) => {
    debug('handleMergeConfirmationResponse called:', { detailAgentId, confirmed });
    if (detailAgentId) {
      const agent = state.agents.find(a => a.id === detailAgentId);
      debug('Found agent:', { id: agent?.id, hasPendingMergeConfirmation: !!agent?.pendingMergeConfirmation });
      if (agent?.pendingMergeConfirmation) {
        debug('Resolving merge confirmation with:', confirmed);
        agent.pendingMergeConfirmation.resolve(confirmed);
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
        onMergeConfirmationResponse={handleMergeConfirmationResponse}
      />
    );
  }

  return (
    <Box flexDirection="column" height={height}>
      <Header
        activeCount={state.agents.filter(a => a.status === 'working').length}
        waitingCount={state.agents.filter(a => a.status === 'waiting').length}
      />

      <Body
        tab={tab}
        mode={mode}
        agents={state.agents}
        history={state.history}
        inboxIdx={inboxIdx}
        histIdx={histIdx}
        onSubmit={(p, at, wt) => { createAgent(p, at, wt); setMode('normal'); setTab('inbox'); }}
        onCancel={() => setMode('normal')}
        onInputStateChange={setInputState}
      />

      <HelpBar tab={tab} mode={mode} inputStep={inputState.step} showSlashMenu={inputState.showSlashMenu} />
    </Box>
  );
};
