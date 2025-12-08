import React, { useState, useEffect, useReducer } from 'react';
import { useInput, useApp } from 'ink';
import type { Agent, AgentType, HistoryEntry, Mode, PermissionRequest, InputStep } from '../types';
import { reducer } from '../state/reducer';
import { loadHistory, saveHistory } from '../state/history';
import { AgentSDKManager } from '../agent/manager';
import { getGitRoot, getCurrentBranch, getRepoName, generateWorktreeName } from '../git/worktree';
import type { WorktreeContext } from '../agent/systemPromptTemplates';
import { genId } from '../utils/helpers';
import { debug } from '../utils/logger';
import { Layout } from './Layout';
import { ListViewPage, getListViewHelp, NewAgentPage, getNewAgentHelp, DetailViewPage, getDetailViewHelp } from '../pages';

const agentManager = new AgentSDKManager();

export const App = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(reducer, { agents: [], history: loadHistory() });
  const [tab, setTab] = useState<'inbox' | 'history'>('inbox');
  const [inboxIdx, setInboxIdx] = useState(0);
  const [histIdx, setHistIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [inputState, setInputState] = useState<{ step: InputStep; showSlashMenu: boolean }>({ step: 'prompt', showSlashMenu: false });

  useEffect(() => {
    const onOutput = (id: string, line: string) => dispatch({ type: 'APPEND_OUTPUT', id, line });
    const onIdle = (id: string) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: 'idle' } });
    };
    const onDone = async (id: string, code: number) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: code === 0 ? 'done' : 'error' } });
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

      if (mode !== 'detail' || detailAgentId !== id) {
        process.stdout.write('\u0007');
      }
    };
    const onTitleUpdate = (id: string, title: string) => {
      debug('Title update received in UI:', { id, title });
      dispatch({ type: 'UPDATE_AGENT_TITLE', id, title });
      dispatch({ type: 'UPDATE_HISTORY_TITLE', id, title });
      const newHistory = state.history.map(h => h.id === id ? { ...h, title } : h);
      saveHistory(newHistory);
    };
    const onMergeReady = (id: string, branchName: string) => {
      debug('Merge ready received in UI:', { id, branchName });
      dispatch({
        type: 'SET_MERGE_STATE',
        id,
        mergeState: { branchName, status: 'ready' }
      });
      if (mode !== 'detail' || detailAgentId !== id) {
        process.stdout.write('\u0007');
      }
    };
    const onMergeConflicts = (id: string, branchName: string) => {
      debug('Merge conflicts received in UI:', { id, branchName });
      dispatch({
        type: 'SET_MERGE_STATE',
        id,
        mergeState: { branchName, status: 'conflicts' }
      });
      if (mode !== 'detail' || detailAgentId !== id) {
        process.stdout.write('\u0007');
      }
    };
    const onMergeFailed = (id: string, branchName: string, error: string) => {
      debug('Merge failed received in UI:', { id, branchName, error });
      dispatch({
        type: 'SET_MERGE_STATE',
        id,
        mergeState: { branchName, status: 'failed', error }
      });
      if (mode !== 'detail' || detailAgentId !== id) {
        process.stdout.write('\u0007');
      }
    };
    const onMergeCompleted = (id: string, branchName: string) => {
      debug('Merge completed received in UI:', { id, branchName });
      dispatch({ type: 'SET_MERGE_STATE', id, mergeState: undefined });
    };

    agentManager.on('output', onOutput);
    agentManager.on('idle', onIdle);
    agentManager.on('done', onDone);
    agentManager.on('error', onError);
    agentManager.on('sessionId', onSessionId);
    agentManager.on('permissionRequest', onPermissionRequest);
    agentManager.on('titleUpdate', onTitleUpdate);
    agentManager.on('mergeReady', onMergeReady);
    agentManager.on('mergeConflicts', onMergeConflicts);
    agentManager.on('mergeFailed', onMergeFailed);
    agentManager.on('mergeCompleted', onMergeCompleted);

    return () => {
      agentManager.off('output', onOutput);
      agentManager.off('idle', onIdle);
      agentManager.off('done', onDone);
      agentManager.off('error', onError);
      agentManager.off('sessionId', onSessionId);
      agentManager.off('permissionRequest', onPermissionRequest);
      agentManager.off('titleUpdate', onTitleUpdate);
      agentManager.off('mergeReady', onMergeReady);
      agentManager.off('mergeConflicts', onMergeConflicts);
      agentManager.off('mergeFailed', onMergeFailed);
      agentManager.off('mergeCompleted', onMergeCompleted);
    };
  }, [state.history, mode, detailAgentId]);

  const createAgent = async (title: string, prompt: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => {
    const id = genId();
    const workDir = process.cwd();
    let worktreeContext: WorktreeContext | undefined;

    if (worktree.enabled) {
      const gitRoot = getGitRoot();
      if (gitRoot) {
        const currentBranch = getCurrentBranch();
        const repoName = getRepoName(gitRoot);
        const suggestedName = worktree.name || generateWorktreeName(prompt);

        worktreeContext = {
          enabled: true,
          suggestedName,
          gitRoot,
          currentBranch,
          repoName
        };

        debug('Worktree context created:', worktreeContext);
      }
    }

    const placeholderAgent: Agent = {
      id,
      title: title || 'Untitled Agent',
      prompt,
      status: 'working',
      output: worktree.enabled ? ['[i] Agent will create git worktree as first action'] : [],
      workDir,
      worktreeName: worktreeContext?.suggestedName,
      createdAt: new Date(),
      updatedAt: new Date(),
      agentType,
      autoAcceptPermissions: false,
    };
    dispatch({ type: 'ADD_AGENT', agent: placeholderAgent });

    debug('Spawning agent:', { id, workDir, agentType, hasWorktreeContext: !!worktreeContext });
    agentManager.spawn(id, prompt, workDir, agentType, false, worktreeContext, title);

    const entry: HistoryEntry = { id, title: title || 'Untitled Agent', prompt, date: new Date(), workDir };
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

  const handleBackFromDetail = () => {
    setMode('normal');
    setChatMode(false);
  };

  const handleSendMessage = async (message: string) => {
    if (!detailAgentId) return;

    try {
      await agentManager.sendFollowUpMessage(detailAgentId, message);
      dispatch({ type: 'UPDATE_AGENT', id: detailAgentId, updates: { status: 'working' } });
    } catch (error: any) {
      debug('Error sending message:', error);
    }
  };

  const handleToggleChatMode = () => {
    setChatMode(prev => !prev);
  };

  const handleMergeResponse = async (approved: boolean) => {
    if (!detailAgentId) return;

    const agent = state.agents.find(a => a.id === detailAgentId);
    if (!agent?.pendingMerge) return;

    if (approved && agent.pendingMerge.status === 'ready') {
      const gitRoot = getGitRoot();
      if (!gitRoot) {
        debug('Cannot merge: not in a git repository');
        dispatch({ type: 'SET_MERGE_STATE', id: detailAgentId, mergeState: undefined });
        return;
      }

      const message = `The merge has been approved. Please proceed with merging the branch "${agent.pendingMerge.branchName}" and cleaning up the worktree. Use these commands:

1. First, return to the git root directory:
   cd ${gitRoot}

2. Merge the branch (no fast-forward to preserve history):
   git merge --no-ff "${agent.pendingMerge.branchName}" -m "Merge worktree: ${agent.pendingMerge.branchName}"

3. Remove the worktree directory:
   git worktree remove ${getRepoName(gitRoot)}-${agent.pendingMerge.branchName}

4. Delete the feature branch:
   git branch -d "${agent.pendingMerge.branchName}"

5. After successful completion, signal with:
   [WORKTREE_MERGED] ${agent.pendingMerge.branchName}

Please execute these commands and report the results.`;

      try {
        await agentManager.sendFollowUpMessage(detailAgentId, message);
        dispatch({ type: 'UPDATE_AGENT', id: detailAgentId, updates: { status: 'working' } });
      } catch (error: any) {
        debug('Error sending merge approval:', error);
      }
    }

    dispatch({ type: 'SET_MERGE_STATE', id: detailAgentId, mergeState: undefined });
  };

  useInput((input, key) => {
    if (mode === 'detail' || mode === 'input') return;

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
        createAgent(entry.title, entry.prompt, 'normal', { enabled: false, name: '' });
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
            onMergeResponse={handleMergeResponse}
            onSendMessage={handleSendMessage}
            onBack={handleBackFromDetail}
            chatMode={chatMode}
            onToggleChatMode={handleToggleChatMode}
          />
        ),
        help: detailAgent.pendingPermission ? null : getDetailViewHelp(promptNeedsScroll, detailAgent.status === 'working' || detailAgent.status === 'idle', chatMode, detailAgent.pendingMerge),
      };
    }

    if (mode === 'input') {
      return {
        content: (
          <NewAgentPage
            onSubmit={(t, p, at, wt) => { createAgent(t, p, at, wt); setMode('normal'); setTab('inbox'); }}
            onCancel={() => { setMode('normal'); }}
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

  return (
    <Layout activeCount={activeCount} waitingCount={waitingCount} helpContent={help}>
      {content}
    </Layout>
  );
};
