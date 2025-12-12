import React, { useState, useEffect, useReducer } from 'react';
import { useInput, useApp } from 'ink';
import type { Agent, AgentType, HistoryEntry, Mode, PermissionRequest, QuestionRequest, InputStep, PermissionMode, ImageAttachment, TokenTracking, CustomAgentType } from '../types';
import { reducer } from '../state/reducer';
import { loadHistory, saveHistory } from '../state/history';
import { AgentSDKManager } from '../agent/manager';
import { getGitRoot, getCurrentBranch, getRepoName, generateUniqueBranchName, createWorktree, testMerge, performMerge, cleanupWorktree } from '../git/worktree';
import type { WorktreeContext } from '../agent/systemPromptTemplates';
import { genId } from '../utils/helpers';
import { debug } from '../utils/logger';
import { listArtifacts, deleteArtifact } from '../utils/artifacts';
import { listTemplates } from '../utils/templates';
import { listAgentTypes } from '../utils/agentTypes';
import { ensureTempImageDir } from '../utils/imageStorage';
import { cleanupOldTempImages } from '../utils/imageCleanup';
import { Layout } from './Layout';
import { ListViewPage, getListViewHelp, NewAgentPage, getNewAgentHelp, DetailViewPage, getDetailViewHelp, ArtifactDetailPage, getArtifactDetailHelp, NewArtifactPage, getNewArtifactHelp } from '../pages';
import { QuitConfirmationPrompt } from './QuitConfirmationPrompt';
import { DeleteConfirmationPrompt } from './DeleteConfirmationPrompt';
import { ArtifactDeleteConfirmationPrompt } from './ArtifactDeleteConfirmationPrompt';
import { CommandPalette } from './CommandPalette';
import { CommandResult } from './CommandResult';
import { HoverWindow } from './HoverWindow';
import { CommandLoader } from '../commands/loader';
import { CommandExecutor } from '../commands/executor';
import type { Command, CommandResult as CommandResultType } from '../commands/types';

const agentManager = new AgentSDKManager();
const commandLoader = new CommandLoader();
const commandExecutor = new CommandExecutor();

export const App = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(reducer, { agents: [], history: loadHistory(), artifacts: [], templates: [], agentTypes: [] });
  const [tab, setTab] = useState<'inbox' | 'history' | 'artifacts'>('inbox');
  const [inboxIdx, setInboxIdx] = useState(0);
  const [histIdx, setHistIdx] = useState(0);
  const [artifactsIdx, setArtifactsIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [detailArtifactPath, setDetailArtifactPath] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [inputState, setInputState] = useState<{ step: InputStep; showSlashMenu: boolean }>({ step: 'prompt', showSlashMenu: false });
  const [editingHistoryEntry, setEditingHistoryEntry] = useState<HistoryEntry | null>(null);
  const [preSelectedArtifactPath, setPreSelectedArtifactPath] = useState<string | null>(null);
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [showArtifactDeleteConfirmation, setShowArtifactDeleteConfirmation] = useState(false);
  const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [commandsLoading, setCommandsLoading] = useState(false);
  const [commandResult, setCommandResult] = useState<{ result: CommandResultType; commandName: string } | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    const loadArtifactsList = async () => {
      const artifacts = await listArtifacts();
      dispatch({ type: 'SET_ARTIFACTS', artifacts });
    };
    loadArtifactsList();

    const interval = setInterval(loadArtifactsList, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadTemplatesList = async () => {
      const templates = await listTemplates();
      dispatch({ type: 'SET_TEMPLATES', templates });
    };
    loadTemplatesList();
  }, []);

  useEffect(() => {
    const loadAgentTypesList = async () => {
      const agentTypes = await listAgentTypes();
      dispatch({ type: 'SET_AGENT_TYPES', agentTypes });
    };
    loadAgentTypesList();
  }, []);

  useEffect(() => {
    const initializeImageStorage = async () => {
      await ensureTempImageDir();
      await cleanupOldTempImages();
    };
    initializeImageStorage();
  }, []);

  useEffect(() => {
    const onOutput = (id: string, line: string, isSubagent: boolean = false, subagentId?: string, subagentType?: string, timestamp?: number) => {
      dispatch({ type: 'APPEND_OUTPUT', id, line: { text: line, isSubagent, subagentId, subagentType }, timestamp });
    };
    const onIdle = async (id: string) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });

      const agent = state.agents.find(a => a.id === id);

      if (agent?.pendingMerge?.status === 'drafting-pr') {
        const recentOutput = agent.output.slice(-20);
        let prUrl: string | undefined;

        for (const line of recentOutput) {
          const match = line.text.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/);
          if (match) {
            prUrl = match[0];
            break;
          }
        }

        dispatch({
          type: 'SET_MERGE_STATE',
          id,
          mergeState: {
            branchName: agent.pendingMerge.branchName,
            status: 'pr-created',
            prUrl
          }
        });

        dispatch({
          type: 'APPEND_OUTPUT',
          id,
          line: { text: prUrl ? `[+] PR created: ${prUrl}` : '[+] PR draft completed', isSubagent: false }
        });

        process.stdout.write('\u0007');
        dispatch({ type: 'UPDATE_AGENT', id, updates: { status: 'idle' } });
        return;
      }

      if (agent?.worktreeName && agent.worktreePath) {
        const gitRoot = getGitRoot();
        if (gitRoot) {
          dispatch({
            type: 'APPEND_OUTPUT',
            id,
            line: { text: '[i] Testing merge viability...', isSubagent: false }
          });

          const mergeResult = await testMerge(gitRoot, agent.worktreeName);

          if (mergeResult.canMerge && !mergeResult.hasConflicts) {
            dispatch({
              type: 'SET_MERGE_STATE',
              id,
              mergeState: { branchName: agent.worktreeName, status: 'ready' }
            });
            process.stdout.write('\u0007');
          } else if (mergeResult.hasConflicts) {
            dispatch({
              type: 'SET_MERGE_STATE',
              id,
              mergeState: {
                branchName: agent.worktreeName,
                status: 'conflicts',
                error: `Conflicts in: ${mergeResult.conflictFiles?.join(', ')}`
              }
            });
            process.stdout.write('\u0007');
          } else if (mergeResult.error) {
            dispatch({
              type: 'SET_MERGE_STATE',
              id,
              mergeState: {
                branchName: agent.worktreeName,
                status: 'failed',
                error: mergeResult.error
              }
            });
            process.stdout.write('\u0007');
          }
        }
      }

      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: 'idle' } });
    };
    const onDone = async (id: string, code: number) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: code === 0 ? 'done' : 'error' } });
    };
    const onError = (id: string, msg: string) => {
      dispatch({ type: 'APPEND_OUTPUT', id, line: { text: `[x] Error: ${msg}`, isSubagent: false } });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: 'error' } });
    };
    const onSessionId = (id: string, sessionId: string) => {
      dispatch({ type: 'UPDATE_AGENT', id, updates: { sessionId } });
    };
    const onPermissionRequest = (id: string, permission: PermissionRequest) => {
      debug('Permission request received in UI:', { id, toolName: permission.toolName });

      const originalResolve = permission.resolve;
      const wrappedPermission = {
        ...permission,
        resolve: (result: { allowed: boolean; suggestions?: unknown[] }) => {
          debug('Permission resolved:', { id, allowed: result.allowed, hasSuggestions: !!result.suggestions });

          if (result.allowed && !result.suggestions) {
            const agent = state.agents.find(a => a.id === id);
            const isEditTool = agent?.pendingPermission && ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(agent.pendingPermission.toolName);

            if (isEditTool) {
              agentManager.setPermissionMode(id, 'acceptEdits');
              dispatch({ type: 'UPDATE_AGENT', id, updates: { permissionMode: 'acceptEdits' } });
            }
          }

          originalResolve(result);
          dispatch({ type: 'DEQUEUE_PERMISSION', id });
        }
      };

      dispatch({ type: 'QUEUE_PERMISSION', id, permission: wrappedPermission });

      if (mode !== 'detail' || detailAgentId !== id) {
        process.stdout.write('\u0007');
      }
    };
    const onQuestionRequest = (id: string, question: QuestionRequest) => {
      debug('Question request received in UI:', { id, questionCount: question.questions.length });
      dispatch({ type: 'SET_QUESTION', id, question });

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
    const onTokenUsage = (id: string, tokenUsage: TokenTracking) => {
      dispatch({ type: 'UPDATE_TOKEN_USAGE', id, tokenUsage });
    };

    agentManager.on('output', onOutput);
    agentManager.on('idle', onIdle);
    agentManager.on('done', onDone);
    agentManager.on('error', onError);
    agentManager.on('sessionId', onSessionId);
    agentManager.on('permissionRequest', onPermissionRequest);
    agentManager.on('questionRequest', onQuestionRequest);
    agentManager.on('titleUpdate', onTitleUpdate);
    agentManager.on('tokenUsage', onTokenUsage);

    return () => {
      agentManager.off('output', onOutput);
      agentManager.off('idle', onIdle);
      agentManager.off('done', onDone);
      agentManager.off('error', onError);
      agentManager.off('sessionId', onSessionId);
      agentManager.off('permissionRequest', onPermissionRequest);
      agentManager.off('questionRequest', onQuestionRequest);
      agentManager.off('titleUpdate', onTitleUpdate);
      agentManager.off('tokenUsage', onTokenUsage);
    };
  }, [state.history, mode, detailAgentId, state.agents]);

  const createAgent = async (title: string, prompt: string, agentType: AgentType, worktree: { enabled: boolean; name: string }, images?: ImageAttachment[], customAgentType?: CustomAgentType) => {
    const id = genId();
    const workDir = process.cwd();
    let worktreeContext: WorktreeContext | undefined;
    let effectiveWorkDir = workDir;

    const permissionMode: PermissionMode = agentType === 'auto-accept' ? 'acceptEdits' : 'default';

    if (worktree.enabled) {
      const gitRoot = getGitRoot();
      if (gitRoot) {
        const currentBranch = getCurrentBranch();
        const repoName = getRepoName(gitRoot);
        const branchName = worktree.name || generateUniqueBranchName(prompt, gitRoot);

        const placeholderAgent: Agent = {
          id,
          title: title || 'Untitled Agent',
          prompt,
          status: 'working',
          output: [{ text: '[i] Setting up git worktree...', isSubagent: false }],
          workDir,
          worktreeName: branchName,
          createdAt: new Date(),
          updatedAt: new Date(),
          agentType,
          permissionMode,
          permissionQueue: [],
          images,
        };
        dispatch({ type: 'ADD_AGENT', agent: placeholderAgent });

        const result = await createWorktree(gitRoot, branchName, currentBranch);

        if (!result.success) {
          dispatch({
            type: 'APPEND_OUTPUT',
            id,
            line: { text: `[x] Failed to create worktree: ${result.error}`, isSubagent: false }
          });
          dispatch({ type: 'UPDATE_AGENT', id, updates: { status: 'error' } });
          return;
        }

        dispatch({
          type: 'APPEND_OUTPUT',
          id,
          line: { text: `[+] Worktree created at: ${result.worktreePath}`, isSubagent: false }
        });

        worktreeContext = {
          enabled: true,
          suggestedName: branchName,
          gitRoot,
          currentBranch,
          repoName,
          worktreePath: result.worktreePath,
          branchName: result.branchName,
        };

        effectiveWorkDir = result.worktreePath!;

        dispatch({
          type: 'UPDATE_AGENT',
          id,
          updates: {
            workDir: effectiveWorkDir,
            worktreePath: result.worktreePath,
            worktreeName: result.branchName
          }
        });

        debug('Worktree context created:', worktreeContext);
      }
    }

    if (!worktree.enabled) {
      const placeholderAgent: Agent = {
        id,
        title: title || 'Untitled Agent',
        prompt,
        status: 'working',
        output: [],
        workDir,
        createdAt: new Date(),
        updatedAt: new Date(),
        agentType,
        permissionMode,
        permissionQueue: [],
        images,
      };
      dispatch({ type: 'ADD_AGENT', agent: placeholderAgent });
    }

    debug('Spawning agent:', { id, effectiveWorkDir, agentType, hasWorktreeContext: !!worktreeContext, imageCount: images?.length || 0, customAgentTypeId: customAgentType?.id });
    agentManager.spawn(id, prompt, effectiveWorkDir, agentType, worktreeContext, title, images, customAgentType);

    const entry: HistoryEntry = {
      id,
      title: title || 'Untitled Agent',
      prompt,
      date: new Date(),
      workDir,
      images: images?.map(img => ({
        id: img.id,
        mediaType: img.mediaType,
        size: img.size || 0
      }))
    };
    const newHistory = [entry, ...state.history.filter(h => h.prompt !== prompt)].slice(0, 5);
    saveHistory(newHistory);
  };


  const handleQuestionResponse = (answers: Record<string, string | string[]>) => {
    debug('handleQuestionResponse called:', { detailAgentId, answers });
    if (detailAgentId) {
      const agent = state.agents.find(a => a.id === detailAgentId);
      if (agent?.pendingQuestion) {
        debug('Resolving question with answers:', answers);
        agent.pendingQuestion.resolve(answers);
        dispatch({ type: 'SET_QUESTION', id: detailAgentId, question: undefined });
      }
    }
  };

  const handleBackFromDetail = () => {
    setMode('normal');
    setChatMode(false);
    setDetailArtifactPath(null);
  };

  const handleSendMessage = async (message: string, images?: ImageAttachment[]) => {
    if (!detailAgentId) return;

    try {
      await agentManager.sendFollowUpMessage(detailAgentId, message, images);
      dispatch({ type: 'UPDATE_AGENT', id: detailAgentId, updates: { status: 'working' } });
    } catch (error: any) {
      debug('Error sending message:', error);
    }
  };

  const handleToggleChatMode = () => {
    setChatMode(prev => !prev);
  };

  const handleQuitRequest = () => {
    const hasActiveAgents = state.agents.some(a => a.status === 'working' || a.status === 'idle');
    if (hasActiveAgents) {
      setShowQuitConfirmation(true);
    } else {
      exit();
    }
  };

  const handleQuitConfirm = () => {
    exit();
  };

  const handleQuitCancel = () => {
    setShowQuitConfirmation(false);
  };

  const handleDeleteRequest = (agentId: string) => {
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return;

    const hasPendingMerge = !!agent.pendingMerge && agent.pendingMerge.status !== 'pr-created';
    if ((agent.status === 'idle' || agent.status === 'done') && !hasPendingMerge) {
      agentManager.kill(agentId);
      dispatch({ type: 'REMOVE_AGENT', id: agentId });
      setInboxIdx(Math.min(inboxIdx, state.agents.length - 2));
    } else {
      setAgentToDelete(agentId);
      setShowDeleteConfirmation(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (agentToDelete) {
      agentManager.kill(agentToDelete);
      dispatch({ type: 'REMOVE_AGENT', id: agentToDelete });
      setInboxIdx(Math.min(inboxIdx, state.agents.length - 2));
      setAgentToDelete(null);
    }
    setShowDeleteConfirmation(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setAgentToDelete(null);
  };

  const handleArtifactDeleteRequest = (artifactPath: string) => {
    setArtifactToDelete(artifactPath);
    setShowArtifactDeleteConfirmation(true);
  };

  const handleArtifactDeleteConfirm = () => {
    if (artifactToDelete) {
      deleteArtifact(artifactToDelete).then(() => {
        listArtifacts().then(artifacts => {
          dispatch({ type: 'SET_ARTIFACTS', artifacts });
          setArtifactsIdx(Math.min(artifactsIdx, artifacts.length - 1));
        });
      }).catch(err => {
        debug('Failed to delete artifact:', err);
      });
    }
    setShowArtifactDeleteConfirmation(false);
    setArtifactToDelete(null);
  };

  const handleArtifactDeleteCancel = () => {
    setShowArtifactDeleteConfirmation(false);
    setArtifactToDelete(null);
  };

  const handleMergeResponse = async (approved: boolean) => {
    if (!detailAgentId) return;

    const agent = state.agents.find(a => a.id === detailAgentId);
    if (!agent?.pendingMerge) return;

    if (agent.pendingMerge.status === 'pr-created') {
      if (approved) {
        dispatch({
          type: 'APPEND_OUTPUT',
          id: detailAgentId,
          line: { text: '[i] Cleaning up worktree...', isSubagent: false }
        });

        if (agent.worktreePath) {
          const cleanupResult = await cleanupWorktree(agent.worktreePath, agent.pendingMerge.branchName);

          if (cleanupResult.success) {
            dispatch({
              type: 'APPEND_OUTPUT',
              id: detailAgentId,
              line: { text: '[+] Worktree cleaned up', isSubagent: false }
            });
          } else {
            dispatch({
              type: 'APPEND_OUTPUT',
              id: detailAgentId,
              line: { text: `[!] Cleanup warning: ${cleanupResult.error}`, isSubagent: false }
            });
          }
        }

        dispatch({
          type: 'UPDATE_AGENT',
          id: detailAgentId,
          updates: { worktreeName: undefined, worktreePath: undefined }
        });
      }

      dispatch({ type: 'SET_MERGE_STATE', id: detailAgentId, mergeState: undefined });
      return;
    }

    if (approved && agent.pendingMerge.status === 'ready') {
      const gitRoot = getGitRoot();
      if (!gitRoot) {
        debug('Cannot merge: not in a git repository');
        dispatch({ type: 'SET_MERGE_STATE', id: detailAgentId, mergeState: undefined });
        return;
      }

      dispatch({
        type: 'APPEND_OUTPUT',
        id: detailAgentId,
        line: { text: '[i] Performing merge...', isSubagent: false }
      });

      const mergeResult = await performMerge(
        gitRoot,
        agent.pendingMerge.branchName,
        `Merge worktree: ${agent.pendingMerge.branchName}`
      );

      if (mergeResult.success) {
        dispatch({
          type: 'APPEND_OUTPUT',
          id: detailAgentId,
          line: { text: '[+] Merge completed successfully', isSubagent: false }
        });

        if (agent.worktreePath) {
          const cleanupResult = await cleanupWorktree(agent.worktreePath, agent.pendingMerge.branchName);

          if (cleanupResult.success) {
            dispatch({
              type: 'APPEND_OUTPUT',
              id: detailAgentId,
              line: { text: '[+] Worktree cleaned up', isSubagent: false }
            });
          } else {
            dispatch({
              type: 'APPEND_OUTPUT',
              id: detailAgentId,
              line: { text: `[!] Cleanup warning: ${cleanupResult.error}`, isSubagent: false }
            });
          }
        }

        dispatch({
          type: 'UPDATE_AGENT',
          id: detailAgentId,
          updates: { worktreeName: undefined, worktreePath: undefined }
        });
      } else {
        dispatch({
          type: 'APPEND_OUTPUT',
          id: detailAgentId,
          line: { text: `[x] Merge failed: ${mergeResult.error}`, isSubagent: false }
        });
      }
    }

    dispatch({ type: 'SET_MERGE_STATE', id: detailAgentId, mergeState: undefined });
  };

  const handleResolveConflicts = async () => {
    if (!detailAgentId) return;

    const agent = state.agents.find(a => a.id === detailAgentId);
    if (!agent?.pendingMerge) return;

    const conflictInfo = agent.pendingMerge.error || 'Unknown merge issue';
    const branchName = agent.pendingMerge.branchName;
    const currentBranch = getCurrentBranch();

    dispatch({
      type: 'SET_MERGE_STATE',
      id: detailAgentId,
      mergeState: { branchName, status: 'resolving' }
    });

    const resolveMessage = agent.pendingMerge.status === 'conflicts'
      ? `The merge to ${currentBranch} branch has conflicts. ${conflictInfo}. Please resolve these conflicts by merging ${currentBranch} into your branch and resolving the conflicts, then commit the result.`
      : `The merge test failed with error: ${conflictInfo}. Please investigate and fix the issue so the branch can be merged to ${currentBranch}.`;

    dispatch({
      type: 'APPEND_OUTPUT',
      id: detailAgentId,
      line: { text: '[i] Asking agent to resolve merge conflicts...', isSubagent: false }
    });

    try {
      await agentManager.sendFollowUpMessage(detailAgentId, resolveMessage);
      dispatch({ type: 'UPDATE_AGENT', id: detailAgentId, updates: { status: 'working' } });
      dispatch({ type: 'SET_MERGE_STATE', id: detailAgentId, mergeState: undefined });
    } catch (error: any) {
      debug('Error sending resolve message:', error);
      dispatch({
        type: 'APPEND_OUTPUT',
        id: detailAgentId,
        line: { text: `[x] Failed to send resolve request: ${error.message}`, isSubagent: false }
      });
    }
  };

  const handleDraftPR = async () => {
    if (!detailAgentId) return;

    const agent = state.agents.find(a => a.id === detailAgentId);
    if (!agent?.pendingMerge || agent.pendingMerge.status !== 'ready') return;

    const branchName = agent.pendingMerge.branchName;

    dispatch({
      type: 'SET_MERGE_STATE',
      id: detailAgentId,
      mergeState: { branchName, status: 'drafting-pr' }
    });

    const prMessage = `Use gh pr create to draft a pull request with the changes in your branch. The gh CLI will guide you through creating the PR with appropriate title and body.`;

    dispatch({
      type: 'APPEND_OUTPUT',
      id: detailAgentId,
      line: { text: '[i] Asking agent to draft PR...', isSubagent: false }
    });

    try {
      await agentManager.sendFollowUpMessage(detailAgentId, prMessage);
      dispatch({ type: 'UPDATE_AGENT', id: detailAgentId, updates: { status: 'working' } });
    } catch (error: any) {
      debug('Error sending PR draft request:', error);
      dispatch({
        type: 'APPEND_OUTPUT',
        id: detailAgentId,
        line: { text: `[x] Failed to send PR draft request: ${error.message}`, isSubagent: false }
      });
      dispatch({
        type: 'SET_MERGE_STATE',
        id: detailAgentId,
        mergeState: { branchName, status: 'ready' }
      });
    }
  };

  const handleOpenCommandPalette = async () => {
    setCommandsLoading(true);
    setShowCommandPalette(true);
    try {
      const loadedCommands = await commandLoader.loadCommands();
      setCommands(loadedCommands);
    } catch (error: any) {
      debug('Error loading commands:', error);
      setCommands([]);
    } finally {
      setCommandsLoading(false);
    }
  };

  const handleExecuteCommand = async (command: Command) => {
    debug('Executing command:', command.id);
    setShowCommandPalette(false);

    try {
      const result = await commandExecutor.execute(command);
      setCommandResult({ result, commandName: command.name });
      setMode('command-result');
    } catch (error: any) {
      debug('Error executing command:', error);
      setCommandResult({
        result: { success: false, message: 'Command execution failed', error: error.message },
        commandName: command.name
      });
      setMode('command-result');
    }
  };

  const handleCommandCancel = () => {
    setShowCommandPalette(false);
  };

  const handleResultDismiss = () => {
    setCommandResult(null);
    setMode('normal');
  };

  useInput((input, key) => {
    if (showQuitConfirmation) {
      if (input === 'y') {
        handleQuitConfirm();
      } else if (input === 'n' || key.escape) {
        handleQuitCancel();
      }
      return;
    }

    if (showDeleteConfirmation) {
      if (input === 'y') {
        handleDeleteConfirm();
      } else if (input === 'n' || key.escape) {
        handleDeleteCancel();
      }
      return;
    }

    if (showArtifactDeleteConfirmation) {
      if (input === 'y') {
        handleArtifactDeleteConfirm();
      } else if (input === 'n' || key.escape) {
        handleArtifactDeleteCancel();
      }
      return;
    }

    if (mode === 'detail' || mode === 'input' || mode === 'command-result' || mode === 'new-artifact' || showCommandPalette) return

    if (key.tab) {
      if (key.shift) {
        setTab(t => t === 'inbox' ? 'history' : t === 'history' ? 'artifacts' : 'inbox');
      } else {
        setTab(t => t === 'inbox' ? 'artifacts' : t === 'artifacts' ? 'history' : 'inbox');
      }
      return;
    }
    if (input === 'q') { handleQuitRequest(); return; }
    if (input === 'n') { setMode('input'); return; }
    if (input === ':') { handleOpenCommandPalette(); return; }

    const list = tab === 'inbox' ? state.agents : tab === 'history' ? state.history : state.artifacts;
    const idx = tab === 'inbox' ? inboxIdx : tab === 'history' ? histIdx : artifactsIdx;
    const setIdx = tab === 'inbox' ? setInboxIdx : tab === 'history' ? setHistIdx : setArtifactsIdx;

    if ((key.upArrow || input === 'k') && idx > 0) setIdx(idx - 1);
    if ((key.downArrow || input === 'j') && idx < list.length - 1) setIdx(idx + 1);

    if (key.return && list[idx]) {
      if (tab === 'inbox') {
        setDetailAgentId(state.agents[idx].id);
        setMode('detail');
      } else if (tab === 'history') {
        const entry = state.history[idx] as HistoryEntry;
        createAgent(entry.title, entry.prompt, 'normal', { enabled: false, name: '' });
        setTab('inbox');
      } else if (tab === 'artifacts') {
        setDetailArtifactPath(state.artifacts[idx].path);
        setMode('detail');
      }
    }

    if (tab === 'inbox' && state.agents[idx]) {
      if (input === 'x') {
        agentManager.kill(state.agents[idx].id);
        dispatch({ type: 'UPDATE_AGENT', id: state.agents[idx].id, updates: { status: 'done' } });
      }
      if (input === 'd') {
        handleDeleteRequest(state.agents[idx].id);
      }
    }

    if (tab === 'history' && state.history[idx]) {
      if (input === 'd') {
        dispatch({ type: 'REMOVE_HISTORY', index: idx });
        const newHistory = state.history.filter((_, i) => i !== idx);
        saveHistory(newHistory);
        setHistIdx(Math.min(histIdx, state.history.length - 2));
      }
      if (input === 'e') {
        const entry = state.history[idx] as HistoryEntry;
        setEditingHistoryEntry(entry);
        setMode('input');
      }
    }

    if (tab === 'artifacts') {
      if (input === 'a') {
        setMode('new-artifact');
        return;
      }
      if (state.artifacts[idx]) {
        if (input === 'd') {
          handleArtifactDeleteRequest(state.artifacts[idx].path);
        }
        if (input === 's') {
          const selectedArtifact = state.artifacts[idx];
          setPreSelectedArtifactPath(selectedArtifact.path);
          setMode('input');
        }
      }
    }
  });

  const detailAgent = state.agents.find(a => a.id === detailAgentId);
  const activeCount = state.agents.filter(a => a.status === 'working').length;
  const waitingCount = state.agents.filter(a => a.status === 'waiting').length;

  const renderPage = () => {
    if (mode === 'command-result' && commandResult) {
      return {
        content: (
          <CommandResult
            result={commandResult.result}
            commandName={commandResult.commandName}
            onDismiss={handleResultDismiss}
          />
        ),
        help: null,
      };
    }

    if (mode === 'detail' && detailArtifactPath) {
      const artifact = state.artifacts.find(a => a.path === detailArtifactPath);
      if (artifact) {
        const listContent = (
          <ListViewPage
            tab={tab}
            agents={state.agents}
            history={state.history}
            artifacts={state.artifacts}
            inboxIdx={inboxIdx}
            histIdx={histIdx}
            artifactsIdx={artifactsIdx}
          />
        );

        const detailContent = (
          <ArtifactDetailPage
            artifact={artifact}
            onBack={handleBackFromDetail}
          />
        );

        return {
          splitPanes: [
            { content: listContent, widthPercent: 40 },
            { content: detailContent, widthPercent: 60 }
          ],
          help: getArtifactDetailHelp(),
        };
      }
    }

    if (mode === 'detail' && detailAgent) {
      const promptLines = detailAgent.prompt.split('\n');
      const promptNeedsScroll = promptLines.length > 10;

      const listContent = (
        <ListViewPage
          tab={tab}
          agents={state.agents}
          history={state.history}
          artifacts={state.artifacts}
          inboxIdx={inboxIdx}
          histIdx={histIdx}
          artifactsIdx={artifactsIdx}
        />
      );

      const detailContent = (
        <DetailViewPage
          agent={detailAgent}
          onQuestionResponse={handleQuestionResponse}
          onMergeResponse={handleMergeResponse}
          onResolveConflicts={handleResolveConflicts}
          onDraftPR={handleDraftPR}
          onSendMessage={handleSendMessage}
          onBack={handleBackFromDetail}
          chatMode={chatMode}
          onToggleChatMode={handleToggleChatMode}
        />
      );

      return {
        splitPanes: [
          { content: listContent, widthPercent: 40 },
          { content: detailContent, widthPercent: 60 }
        ],
        help: getDetailViewHelp(promptNeedsScroll, detailAgent.status === 'working' || detailAgent.status === 'idle', chatMode, detailAgent.pendingMerge, !!detailAgent.pendingPermission, !!detailAgent.pendingQuestion),
      };
    }

    if (mode === 'input') {
      return {
        content: (
          <NewAgentPage
            onSubmit={(t, p, at, wt, imgs, cat) => { createAgent(t, p, at, wt, imgs, cat); setMode('normal'); setTab('inbox'); setInboxIdx(state.agents.length); setEditingHistoryEntry(null); setPreSelectedArtifactPath(null); }}
            onCancel={() => { setMode('normal'); setEditingHistoryEntry(null); setPreSelectedArtifactPath(null); }}
            onStateChange={setInputState}
            initialHistoryEntry={editingHistoryEntry}
            initialArtifactPath={preSelectedArtifactPath}
            customAgentTypes={state.agentTypes}
          />
        ),
        help: getNewAgentHelp(inputState.step, inputState.showSlashMenu),
      };
    }

    if (mode === 'new-artifact') {
      return {
        content: (
          <NewArtifactPage
            templates={state.templates}
            onComplete={async (artifactPath) => {
              const artifacts = await listArtifacts();
              dispatch({ type: 'SET_ARTIFACTS', artifacts });
              setMode('normal');
              setDetailArtifactPath(artifactPath);
              setMode('detail');
            }}
            onCancel={() => { setMode('normal'); }}
          />
        ),
        help: getNewArtifactHelp('template'),
      };
    }

    return {
      content: (
        <ListViewPage
          tab={tab}
          agents={state.agents}
          history={state.history}
          artifacts={state.artifacts}
          inboxIdx={inboxIdx}
          histIdx={histIdx}
          artifactsIdx={artifactsIdx}
        />
      ),
      help: getListViewHelp(tab),
    };
  };

  const { content, help, splitPanes } = renderPage();

  const quitPrompt = showQuitConfirmation ? (
    <QuitConfirmationPrompt
      activeCount={state.agents.filter(a => a.status === 'working' || a.status === 'idle').length}
      onConfirm={handleQuitConfirm}
      onCancel={handleQuitCancel}
    />
  ) : undefined;

  const agentToDeleteData = agentToDelete ? state.agents.find(a => a.id === agentToDelete) : null;
  const deletePrompt = showDeleteConfirmation && agentToDeleteData ? (
    <DeleteConfirmationPrompt
      agentTitle={agentToDeleteData.title}
      agentStatus={agentToDeleteData.status}
      hasPendingMerge={!!agentToDeleteData.pendingMerge && agentToDeleteData.pendingMerge.status !== 'pr-created'}
      onConfirm={handleDeleteConfirm}
      onCancel={handleDeleteCancel}
    />
  ) : undefined;

  const artifactToDeleteData = artifactToDelete ? state.artifacts.find(a => a.path === artifactToDelete) : null;
  const artifactDeletePromptEl = showArtifactDeleteConfirmation && artifactToDeleteData ? (
    <ArtifactDeleteConfirmationPrompt
      artifactName={artifactToDeleteData.name}
      onConfirm={handleArtifactDeleteConfirm}
      onCancel={handleArtifactDeleteCancel}
    />
  ) : undefined;

  const commandPaletteWindow = showCommandPalette ? (
    <HoverWindow
      width={80}
      height={22}
      position="center"
      showBorder={true}
      borderColor="cyan"
      borderStyle="round"
      dimBackground={true}
      padding={1}
    >
      <CommandPalette
        commands={commands}
        onExecute={handleExecuteCommand}
        onCancel={handleCommandCancel}
        loading={commandsLoading}
      />
    </HoverWindow>
  ) : undefined;

  return (
    <Layout activeCount={activeCount} waitingCount={waitingCount} helpContent={help} splitPanes={splitPanes} quitPrompt={quitPrompt} deletePrompt={deletePrompt} artifactDeletePrompt={artifactDeletePromptEl} hoverWindows={commandPaletteWindow}>
      {content}
    </Layout>
  );
};
