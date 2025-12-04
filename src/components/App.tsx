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
import { generateArtifactFilename, getArtifactPath } from '../utils/artifacts';
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
  const [pendingArtifact, setPendingArtifact] = useState<{ path: string; createdAt: Date } | null>(null);

  useEffect(() => {
    const onOutput = (id: string, line: string) => dispatch({ type: 'APPEND_OUTPUT', id, line });
    const onDone = async (id: string, code: number) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: code === 0 ? 'done' : 'error' } });

      if (code === 0) {
        const agent = state.agents.find(a => a.id === id);
        if (agent && !agent.artifact) {
          try {
            const filename = generateArtifactFilename(agent.title);
            const artifactPath = getArtifactPath(filename);
            debug('Auto-requesting artifact for completed agent:', agent.title);
            await agentManager.requestArtifact(id, artifactPath);
          } catch (error: any) {
            debug('Error auto-requesting artifact:', error);
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
    const onArtifactRequested = (id: string, path: string) => {
      debug('Artifact requested:', { id, path });
      dispatch({ type: 'SAVE_ARTIFACT', id, artifact: { path, createdAt: new Date() } });
    };

    agentManager.on('output', onOutput);
    agentManager.on('done', onDone);
    agentManager.on('error', onError);
    agentManager.on('sessionId', onSessionId);
    agentManager.on('permissionRequest', onPermissionRequest);
    agentManager.on('titleUpdate', onTitleUpdate);
    agentManager.on('artifactRequested', onArtifactRequested);

    return () => {
      agentManager.off('output', onOutput);
      agentManager.off('done', onDone);
      agentManager.off('error', onError);
      agentManager.off('sessionId', onSessionId);
      agentManager.off('permissionRequest', onPermissionRequest);
      agentManager.off('titleUpdate', onTitleUpdate);
      agentManager.off('artifactRequested', onArtifactRequested);
    };
  }, [state.history]);

  const createAgent = async (title: string, prompt: string, agentType: AgentType, worktree: { enabled: boolean; name: string }, artifact?: { path: string; createdAt: Date }) => {
    const id = genId();
    const workDir = process.cwd();
    let worktreeContext: WorktreeContext | undefined;
    let finalPrompt = prompt;

    if (artifact) {
      finalPrompt = `${prompt}\n\n[Context from previous agent]\nPlease refer to the artifact at: ${artifact.path}\nRead this file for context before proceeding with the task.`;
    }

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
      output: worktree.enabled ? ['[i] Agent will create git worktree as first action'] : artifact ? ['[i] Agent will receive artifact context'] : [],
      workDir,
      worktreeName: worktreeContext?.suggestedName,
      createdAt: new Date(),
      updatedAt: new Date(),
      agentType,
      autoAcceptPermissions: false,
      artifact,
    };
    dispatch({ type: 'ADD_AGENT', agent: placeholderAgent });

    debug('Spawning agent:', { id, workDir, agentType, hasWorktreeContext: !!worktreeContext, hasArtifact: !!artifact });
    agentManager.spawn(id, finalPrompt, workDir, agentType, false, worktreeContext, title);

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

  const handleCreateArtifact = async () => {
    debug('handleCreateArtifact called');
    if (!detailAgentId) {
      debug('No detailAgentId');
      return;
    }

    const agent = state.agents.find(a => a.id === detailAgentId);
    if (!agent) {
      debug('Agent not found:', detailAgentId);
      return;
    }

    debug('Creating artifact for agent:', agent.title);

    try {
      const filename = generateArtifactFilename(agent.title);
      const artifactPath = getArtifactPath(filename);

      debug('Artifact path:', artifactPath);
      await agentManager.requestArtifact(detailAgentId, artifactPath);
      debug('Artifact request sent successfully');
    } catch (error: any) {
      debug('Error creating artifact:', error);
    }
  };

  const handleContinueWithArtifact = () => {
    if (!detailAgentId) return;

    const agent = state.agents.find(a => a.id === detailAgentId);
    if (!agent || !agent.artifact) return;

    setPendingArtifact(agent.artifact);
    setMode('input');
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

  useInput((input, key) => {
    if (mode === 'detail' || mode === 'input') return;

    if (key.tab) { setTab(t => t === 'inbox' ? 'history' : 'inbox'); return; }
    if (input === 'q') { exit(); return; }
    if (input === 'n') { setMode('input'); setPendingArtifact(null); return; }

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
        createAgent(entry.title, entry.prompt, 'normal', { enabled: false, name: '' }, undefined);
        setTab('inbox');
      }
    }

    if (tab === 'inbox' && state.agents[idx]) {
      if (input === 'c' && state.agents[idx].artifact) {
        setPendingArtifact(state.agents[idx].artifact!);
        setMode('input');
        return;
      }
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
            onRequestArtifact={handleCreateArtifact}
            onContinueWithArtifact={handleContinueWithArtifact}
            onSendMessage={handleSendMessage}
            onBack={handleBackFromDetail}
            chatMode={chatMode}
            onToggleChatMode={handleToggleChatMode}
          />
        ),
        help: detailAgent.pendingPermission ? null : getDetailViewHelp(promptNeedsScroll, !!detailAgent.artifact, detailAgent.status === 'done', chatMode),
      };
    }

    if (mode === 'input') {
      return {
        content: (
          <NewAgentPage
            onSubmit={(t, p, at, wt) => { createAgent(t, p, at, wt, pendingArtifact || undefined); setMode('normal'); setTab('inbox'); setPendingArtifact(null); }}
            onCancel={() => { setMode('normal'); setPendingArtifact(null); }}
            onStateChange={setInputState}
            artifact={pendingArtifact || undefined}
          />
        ),
        help: getNewAgentHelp(inputState.step, inputState.showSlashMenu),
      };
    }

    const selectedAgent = tab === 'inbox' ? state.agents[inboxIdx] : undefined;
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
      help: getListViewHelp(tab, selectedAgent?.artifact !== undefined),
    };
  };

  const { content, help } = renderPage();

  return (
    <Layout activeCount={activeCount} waitingCount={waitingCount} helpContent={help}>
      {content}
    </Layout>
  );
};
