import { describe, it, expect, beforeEach } from 'vitest';
import { reducer } from './reducer';
import type { State, Agent, PermissionRequest, QuestionRequest, MergeState, OutputLine, ArtifactInfo } from '../types';

function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    title: 'Test Agent',
    status: 'working',
    prompt: 'Test prompt',
    output: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    workDir: '/test/dir',
    agentType: 'normal',
    permissionMode: 'default',
    permissionQueue: [],
    ...overrides,
  };
}

function createMockOutputLine(overrides: Partial<OutputLine> = {}): OutputLine {
  return {
    text: 'Test output',
    isSubagent: false,
    ...overrides,
  };
}

function createMockPermissionRequest(overrides: Partial<PermissionRequest> = {}): PermissionRequest {
  return {
    toolName: 'Write',
    toolInput: { file_path: '/test/file.ts' },
    resolve: () => {},
    ...overrides,
  };
}

function createMockQuestionRequest(overrides: Partial<QuestionRequest> = {}): QuestionRequest {
  return {
    questions: [
      {
        question: 'Which option?',
        header: 'Choice',
        options: [
          { label: 'Option A', description: 'First option' },
          { label: 'Option B', description: 'Second option' },
        ],
        multiSelect: false,
      },
    ],
    resolve: () => {},
    ...overrides,
  };
}

describe('reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = {
      agents: [],
      history: [],
      artifacts: [],
      templates: [],
      agentTypes: [],
      workflows: [],
      workflowExecutions: [],
    };
  });

  describe('ADD_AGENT', () => {
    it('adds a new agent to the state', () => {
      const agent = createMockAgent();
      const result = reducer(initialState, { type: 'ADD_AGENT', agent });

      expect(result.agents).toHaveLength(1);
      expect(result.agents[0]).toEqual(agent);
    });

    it('does not mutate the original state', () => {
      const agent = createMockAgent();
      reducer(initialState, { type: 'ADD_AGENT', agent });

      expect(initialState.agents).toHaveLength(0);
    });

    it('appends new agent to existing agents', () => {
      const agent1 = createMockAgent({ id: 'agent-1' });
      const agent2 = createMockAgent({ id: 'agent-2' });

      const state = { ...initialState, agents: [agent1] };
      const result = reducer(state, { type: 'ADD_AGENT', agent: agent2 });

      expect(result.agents).toHaveLength(2);
      expect(result.agents[0].id).toBe('agent-1');
      expect(result.agents[1].id).toBe('agent-2');
    });
  });

  describe('UPDATE_AGENT', () => {
    it('updates an existing agent with partial data', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'UPDATE_AGENT',
        id: 'agent-1',
        updates: { status: 'idle' },
      });

      expect(result.agents[0].status).toBe('idle');
      expect(result.agents[0].title).toBe('Test Agent');
    });

    it('sets updatedAt timestamp', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const beforeUpdate = new Date();

      const result = reducer(state, {
        type: 'UPDATE_AGENT',
        id: 'agent-1',
        updates: { status: 'done' },
      });

      expect(result.agents[0].updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('does not update agents with different id', () => {
      const agent1 = createMockAgent({ id: 'agent-1' });
      const agent2 = createMockAgent({ id: 'agent-2', title: 'Agent 2' });
      const state = { ...initialState, agents: [agent1, agent2] };

      const result = reducer(state, {
        type: 'UPDATE_AGENT',
        id: 'agent-1',
        updates: { title: 'Updated' },
      });

      expect(result.agents[0].title).toBe('Updated');
      expect(result.agents[1].title).toBe('Agent 2');
    });

    it('does not mutate the original state', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };

      reducer(state, {
        type: 'UPDATE_AGENT',
        id: 'agent-1',
        updates: { status: 'done' },
      });

      expect(state.agents[0].status).toBe('working');
    });
  });

  describe('UPDATE_AGENT_TITLE', () => {
    it('updates the title of an agent', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'UPDATE_AGENT_TITLE',
        id: 'agent-1',
        title: 'New Title',
      });

      expect(result.agents[0].title).toBe('New Title');
    });

    it('sets updatedAt timestamp', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const beforeUpdate = new Date();

      const result = reducer(state, {
        type: 'UPDATE_AGENT_TITLE',
        id: 'agent-1',
        title: 'New Title',
      });

      expect(result.agents[0].updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('does not update agents with different id', () => {
      const agent1 = createMockAgent({ id: 'agent-1', title: 'Agent 1' });
      const agent2 = createMockAgent({ id: 'agent-2', title: 'Agent 2' });
      const state = { ...initialState, agents: [agent1, agent2] };

      const result = reducer(state, {
        type: 'UPDATE_AGENT_TITLE',
        id: 'agent-1',
        title: 'Updated',
      });

      expect(result.agents[0].title).toBe('Updated');
      expect(result.agents[1].title).toBe('Agent 2');
    });
  });

  describe('REMOVE_AGENT', () => {
    it('removes an agent by id', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, { type: 'REMOVE_AGENT', id: 'agent-1' });

      expect(result.agents).toHaveLength(0);
    });

    it('keeps other agents when removing one', () => {
      const agent1 = createMockAgent({ id: 'agent-1' });
      const agent2 = createMockAgent({ id: 'agent-2' });
      const state = { ...initialState, agents: [agent1, agent2] };

      const result = reducer(state, { type: 'REMOVE_AGENT', id: 'agent-1' });

      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].id).toBe('agent-2');
    });

    it('does nothing if agent id does not exist', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, { type: 'REMOVE_AGENT', id: 'nonexistent' });

      expect(result.agents).toHaveLength(1);
    });

    it('does not mutate the original state', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };

      reducer(state, { type: 'REMOVE_AGENT', id: 'agent-1' });

      expect(state.agents).toHaveLength(1);
    });
  });

  describe('APPEND_OUTPUT', () => {
    it('appends an output line to an agent', () => {
      const agent = createMockAgent({ output: [] });
      const state = { ...initialState, agents: [agent] };
      const line = createMockOutputLine({ text: 'New output' });

      const result = reducer(state, {
        type: 'APPEND_OUTPUT',
        id: 'agent-1',
        line,
      });

      expect(result.agents[0].output).toHaveLength(1);
      expect(result.agents[0].output[0].text).toBe('New output');
    });

    it('appends to existing output', () => {
      const existingLine = createMockOutputLine({ text: 'Line 1' });
      const agent = createMockAgent({ output: [existingLine] });
      const state = { ...initialState, agents: [agent] };
      const newLine = createMockOutputLine({ text: 'Line 2' });

      const result = reducer(state, {
        type: 'APPEND_OUTPUT',
        id: 'agent-1',
        line: newLine,
      });

      expect(result.agents[0].output).toHaveLength(2);
      expect(result.agents[0].output[0].text).toBe('Line 1');
      expect(result.agents[0].output[1].text).toBe('Line 2');
    });

    it('limits output to 501 lines (500 + 1 new)', () => {
      const existingLines = Array(500).fill(null).map((_, i) =>
        createMockOutputLine({ text: `Line ${i}` })
      );
      const agent = createMockAgent({ output: existingLines });
      const state = { ...initialState, agents: [agent] };
      const newLine = createMockOutputLine({ text: 'New line' });

      const result = reducer(state, {
        type: 'APPEND_OUTPUT',
        id: 'agent-1',
        line: newLine,
      });

      expect(result.agents[0].output.length).toBeLessThanOrEqual(501);
      expect(result.agents[0].output[result.agents[0].output.length - 1].text).toBe('New line');
    });

    it('removes oldest lines when exceeding limit', () => {
      const existingLines = Array(502).fill(null).map((_, i) =>
        createMockOutputLine({ text: `Line ${i}` })
      );
      const agent = createMockAgent({ output: existingLines });
      const state = { ...initialState, agents: [agent] };
      const newLine = createMockOutputLine({ text: 'New line' });

      const result = reducer(state, {
        type: 'APPEND_OUTPUT',
        id: 'agent-1',
        line: newLine,
      });

      expect(result.agents[0].output[0].text).not.toBe('Line 0');
    });

    it('sets updatedAt timestamp', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const beforeUpdate = new Date();

      const result = reducer(state, {
        type: 'APPEND_OUTPUT',
        id: 'agent-1',
        line: createMockOutputLine(),
      });

      expect(result.agents[0].updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('handles subagent output lines', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const subagentLine = createMockOutputLine({
        text: 'Subagent output',
        isSubagent: true,
        subagentId: 'sub-1',
        subagentType: 'Explore',
      });

      const result = reducer(state, {
        type: 'APPEND_OUTPUT',
        id: 'agent-1',
        line: subagentLine,
      });

      expect(result.agents[0].output[0].isSubagent).toBe(true);
      expect(result.agents[0].output[0].subagentId).toBe('sub-1');
      expect(result.agents[0].output[0].subagentType).toBe('Explore');
    });
  });

  describe('SET_PERMISSION', () => {
    it('sets a pending permission request', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const permission = createMockPermissionRequest();

      const result = reducer(state, {
        type: 'SET_PERMISSION',
        id: 'agent-1',
        permission,
      });

      expect(result.agents[0].pendingPermission).toEqual(permission);
    });

    it('sets status to waiting when permission is set', () => {
      const agent = createMockAgent({ status: 'working' });
      const state = { ...initialState, agents: [agent] };
      const permission = createMockPermissionRequest();

      const result = reducer(state, {
        type: 'SET_PERMISSION',
        id: 'agent-1',
        permission,
      });

      expect(result.agents[0].status).toBe('waiting');
    });

    it('clears permission when set to undefined', () => {
      const permission = createMockPermissionRequest();
      const agent = createMockAgent({ pendingPermission: permission, status: 'waiting' });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'SET_PERMISSION',
        id: 'agent-1',
        permission: undefined,
      });

      expect(result.agents[0].pendingPermission).toBeUndefined();
    });

    it('sets status to working when permission is cleared and no queue', () => {
      const permission = createMockPermissionRequest();
      const agent = createMockAgent({
        pendingPermission: permission,
        status: 'waiting',
        permissionQueue: [],
      });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'SET_PERMISSION',
        id: 'agent-1',
        permission: undefined,
      });

      expect(result.agents[0].status).toBe('working');
    });

    it('keeps status waiting when permission cleared but queue has items', () => {
      const permission = createMockPermissionRequest();
      const queuedPermission = createMockPermissionRequest({ toolName: 'Edit' });
      const agent = createMockAgent({
        pendingPermission: permission,
        status: 'waiting',
        permissionQueue: [queuedPermission],
      });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'SET_PERMISSION',
        id: 'agent-1',
        permission: undefined,
      });

      expect(result.agents[0].status).toBe('waiting');
    });
  });

  describe('QUEUE_PERMISSION', () => {
    it('sets permission directly if no pending permission', () => {
      const agent = createMockAgent({ pendingPermission: undefined });
      const state = { ...initialState, agents: [agent] };
      const permission = createMockPermissionRequest();

      const result = reducer(state, {
        type: 'QUEUE_PERMISSION',
        id: 'agent-1',
        permission,
      });

      expect(result.agents[0].pendingPermission).toEqual(permission);
      expect(result.agents[0].permissionQueue).toHaveLength(0);
    });

    it('adds to queue if there is a pending permission', () => {
      const existingPermission = createMockPermissionRequest({ toolName: 'Write' });
      const agent = createMockAgent({ pendingPermission: existingPermission });
      const state = { ...initialState, agents: [agent] };
      const newPermission = createMockPermissionRequest({ toolName: 'Edit' });

      const result = reducer(state, {
        type: 'QUEUE_PERMISSION',
        id: 'agent-1',
        permission: newPermission,
      });

      expect(result.agents[0].pendingPermission).toEqual(existingPermission);
      expect(result.agents[0].permissionQueue).toHaveLength(1);
      expect(result.agents[0].permissionQueue[0]).toEqual(newPermission);
    });

    it('sets status to waiting', () => {
      const agent = createMockAgent({ status: 'working' });
      const state = { ...initialState, agents: [agent] };
      const permission = createMockPermissionRequest();

      const result = reducer(state, {
        type: 'QUEUE_PERMISSION',
        id: 'agent-1',
        permission,
      });

      expect(result.agents[0].status).toBe('waiting');
    });

    it('appends to existing queue', () => {
      const pendingPermission = createMockPermissionRequest({ toolName: 'Write' });
      const queuedPermission = createMockPermissionRequest({ toolName: 'Edit' });
      const agent = createMockAgent({
        pendingPermission,
        permissionQueue: [queuedPermission],
      });
      const state = { ...initialState, agents: [agent] };
      const newPermission = createMockPermissionRequest({ toolName: 'Bash' });

      const result = reducer(state, {
        type: 'QUEUE_PERMISSION',
        id: 'agent-1',
        permission: newPermission,
      });

      expect(result.agents[0].permissionQueue).toHaveLength(2);
      expect(result.agents[0].permissionQueue[1]).toEqual(newPermission);
    });
  });

  describe('DEQUEUE_PERMISSION', () => {
    it('moves next queued permission to pending', () => {
      const queuedPermission = createMockPermissionRequest({ toolName: 'Edit' });
      const agent = createMockAgent({
        pendingPermission: undefined,
        permissionQueue: [queuedPermission],
      });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'DEQUEUE_PERMISSION',
        id: 'agent-1',
      });

      expect(result.agents[0].pendingPermission).toEqual(queuedPermission);
      expect(result.agents[0].permissionQueue).toHaveLength(0);
    });

    it('sets status to waiting when there is a next permission', () => {
      const queuedPermission = createMockPermissionRequest();
      const agent = createMockAgent({
        permissionQueue: [queuedPermission],
        status: 'working',
      });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'DEQUEUE_PERMISSION',
        id: 'agent-1',
      });

      expect(result.agents[0].status).toBe('waiting');
    });

    it('sets status to working when queue is empty', () => {
      const agent = createMockAgent({
        permissionQueue: [],
        status: 'waiting',
      });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'DEQUEUE_PERMISSION',
        id: 'agent-1',
      });

      expect(result.agents[0].status).toBe('working');
      expect(result.agents[0].pendingPermission).toBeUndefined();
    });

    it('removes first item from queue', () => {
      const permission1 = createMockPermissionRequest({ toolName: 'Write' });
      const permission2 = createMockPermissionRequest({ toolName: 'Edit' });
      const agent = createMockAgent({
        permissionQueue: [permission1, permission2],
      });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'DEQUEUE_PERMISSION',
        id: 'agent-1',
      });

      expect(result.agents[0].pendingPermission).toEqual(permission1);
      expect(result.agents[0].permissionQueue).toHaveLength(1);
      expect(result.agents[0].permissionQueue[0]).toEqual(permission2);
    });
  });

  describe('SET_QUESTION', () => {
    it('sets a pending question request', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const question = createMockQuestionRequest();

      const result = reducer(state, {
        type: 'SET_QUESTION',
        id: 'agent-1',
        question,
      });

      expect(result.agents[0].pendingQuestion).toEqual(question);
    });

    it('sets status to waiting when question is set', () => {
      const agent = createMockAgent({ status: 'working' });
      const state = { ...initialState, agents: [agent] };
      const question = createMockQuestionRequest();

      const result = reducer(state, {
        type: 'SET_QUESTION',
        id: 'agent-1',
        question,
      });

      expect(result.agents[0].status).toBe('waiting');
    });

    it('clears question when set to undefined', () => {
      const question = createMockQuestionRequest();
      const agent = createMockAgent({ pendingQuestion: question });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'SET_QUESTION',
        id: 'agent-1',
        question: undefined,
      });

      expect(result.agents[0].pendingQuestion).toBeUndefined();
    });

    it('sets status to working when question is cleared', () => {
      const question = createMockQuestionRequest();
      const agent = createMockAgent({ pendingQuestion: question, status: 'waiting' });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'SET_QUESTION',
        id: 'agent-1',
        question: undefined,
      });

      expect(result.agents[0].status).toBe('working');
    });
  });

  describe('SET_MERGE_STATE', () => {
    it('sets a pending merge state', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const mergeState: MergeState = {
        branchName: 'feature-branch',
        status: 'ready',
      };

      const result = reducer(state, {
        type: 'SET_MERGE_STATE',
        id: 'agent-1',
        mergeState,
      });

      expect(result.agents[0].pendingMerge).toEqual(mergeState);
    });

    it('clears merge state when set to undefined', () => {
      const mergeState: MergeState = { branchName: 'feature', status: 'ready' };
      const agent = createMockAgent({ pendingMerge: mergeState });
      const state = { ...initialState, agents: [agent] };

      const result = reducer(state, {
        type: 'SET_MERGE_STATE',
        id: 'agent-1',
        mergeState: undefined,
      });

      expect(result.agents[0].pendingMerge).toBeUndefined();
    });

    it('handles conflicts status', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const mergeState: MergeState = {
        branchName: 'feature-branch',
        status: 'conflicts',
      };

      const result = reducer(state, {
        type: 'SET_MERGE_STATE',
        id: 'agent-1',
        mergeState,
      });

      expect(result.agents[0].pendingMerge?.status).toBe('conflicts');
    });

    it('handles failed status with error message', () => {
      const agent = createMockAgent();
      const state = { ...initialState, agents: [agent] };
      const mergeState: MergeState = {
        branchName: 'feature-branch',
        status: 'failed',
        error: 'Git error: merge failed',
      };

      const result = reducer(state, {
        type: 'SET_MERGE_STATE',
        id: 'agent-1',
        mergeState,
      });

      expect(result.agents[0].pendingMerge?.status).toBe('failed');
      expect(result.agents[0].pendingMerge?.error).toBe('Git error: merge failed');
    });
  });

  describe('REMOVE_HISTORY', () => {
    it('removes a history entry by index', () => {
      const state: State = {
        ...initialState,
        history: [
          { id: 'h1', title: 'Task 1', prompt: 'Do thing 1', date: new Date(), workDir: '/test' },
          { id: 'h2', title: 'Task 2', prompt: 'Do thing 2', date: new Date(), workDir: '/test' },
        ],
      };

      const result = reducer(state, { type: 'REMOVE_HISTORY', index: 0 });

      expect(result.history).toHaveLength(1);
      expect(result.history[0].id).toBe('h2');
    });

    it('removes the correct entry when index is in the middle', () => {
      const state: State = {
        ...initialState,
        history: [
          { id: 'h1', title: 'Task 1', prompt: 'Prompt 1', date: new Date(), workDir: '/test' },
          { id: 'h2', title: 'Task 2', prompt: 'Prompt 2', date: new Date(), workDir: '/test' },
          { id: 'h3', title: 'Task 3', prompt: 'Prompt 3', date: new Date(), workDir: '/test' },
        ],
      };

      const result = reducer(state, { type: 'REMOVE_HISTORY', index: 1 });

      expect(result.history).toHaveLength(2);
      expect(result.history[0].id).toBe('h1');
      expect(result.history[1].id).toBe('h3');
    });

    it('does not mutate the original state', () => {
      const state: State = {
        ...initialState,
        history: [
          { id: 'h1', title: 'Task 1', prompt: 'Prompt 1', date: new Date(), workDir: '/test' },
        ],
      };

      reducer(state, { type: 'REMOVE_HISTORY', index: 0 });

      expect(state.history).toHaveLength(1);
    });
  });

  describe('UPDATE_HISTORY_TITLE', () => {
    it('updates the title of a history entry', () => {
      const state: State = {
        ...initialState,
        history: [
          { id: 'h1', title: 'Old Title', prompt: 'Prompt', date: new Date(), workDir: '/test' },
        ],
      };

      const result = reducer(state, {
        type: 'UPDATE_HISTORY_TITLE',
        id: 'h1',
        title: 'New Title',
      });

      expect(result.history[0].title).toBe('New Title');
    });

    it('does not update history entries with different id', () => {
      const state: State = {
        ...initialState,
        history: [
          { id: 'h1', title: 'Title 1', prompt: 'Prompt 1', date: new Date(), workDir: '/test' },
          { id: 'h2', title: 'Title 2', prompt: 'Prompt 2', date: new Date(), workDir: '/test' },
        ],
      };

      const result = reducer(state, {
        type: 'UPDATE_HISTORY_TITLE',
        id: 'h1',
        title: 'Updated',
      });

      expect(result.history[0].title).toBe('Updated');
      expect(result.history[1].title).toBe('Title 2');
    });

    it('does not mutate the original state', () => {
      const state: State = {
        ...initialState,
        history: [
          { id: 'h1', title: 'Original', prompt: 'Prompt', date: new Date(), workDir: '/test' },
        ],
      };

      reducer(state, {
        type: 'UPDATE_HISTORY_TITLE',
        id: 'h1',
        title: 'Updated',
      });

      expect(state.history[0].title).toBe('Original');
    });
  });

  describe('SET_ARTIFACTS', () => {
    it('sets artifacts in state', () => {
      const artifacts: ArtifactInfo[] = [
        { name: 'plan.md', path: '/artifacts/plan.md', modifiedAt: new Date() },
        { name: 'notes.md', path: '/artifacts/notes.md', modifiedAt: new Date() },
      ];

      const result = reducer(initialState, {
        type: 'SET_ARTIFACTS',
        artifacts,
      });

      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts[0].name).toBe('plan.md');
      expect(result.artifacts[1].name).toBe('notes.md');
    });

    it('replaces existing artifacts', () => {
      const state: State = {
        ...initialState,
        artifacts: [
          { name: 'old.md', path: '/artifacts/old.md', modifiedAt: new Date() },
        ],
      };
      const newArtifacts: ArtifactInfo[] = [
        { name: 'new.md', path: '/artifacts/new.md', modifiedAt: new Date() },
      ];

      const result = reducer(state, {
        type: 'SET_ARTIFACTS',
        artifacts: newArtifacts,
      });

      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts[0].name).toBe('new.md');
    });

    it('can set empty artifacts array', () => {
      const state: State = {
        ...initialState,
        artifacts: [
          { name: 'file.md', path: '/artifacts/file.md', modifiedAt: new Date() },
        ],
      };

      const result = reducer(state, {
        type: 'SET_ARTIFACTS',
        artifacts: [],
      });

      expect(result.artifacts).toHaveLength(0);
    });

    it('does not mutate the original state', () => {
      const state: State = {
        ...initialState,
        artifacts: [],
      };

      reducer(state, {
        type: 'SET_ARTIFACTS',
        artifacts: [{ name: 'new.md', path: '/path', modifiedAt: new Date() }],
      });

      expect(state.artifacts).toHaveLength(0);
    });
  });

  describe('REMOVE_WORKFLOW', () => {
    it('removes workflow execution and associated agents', () => {
      const agent1 = createMockAgent({ id: 'agent-1' });
      const agent2 = createMockAgent({ id: 'agent-2' });
      const agent3 = createMockAgent({ id: 'agent-3' });

      const state: State = {
        ...initialState,
        agents: [agent1, agent2, agent3],
        workflowExecutions: [
          {
            executionId: 'exec-1',
            workflowId: 'workflow-1',
            currentStageIndex: 0,
            status: 'running',
            stageStates: [
              { stageId: 'stage-1', status: 'running', agentId: 'agent-1' },
              { stageId: 'stage-2', status: 'pending', agentId: 'agent-2' },
            ],
            initialPrompt: 'Test prompt',
          },
        ],
      };

      const result = reducer(state, {
        type: 'REMOVE_WORKFLOW',
        executionId: 'exec-1',
        agentIds: ['agent-1', 'agent-2'],
      });

      expect(result.workflowExecutions).toHaveLength(0);
      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].id).toBe('agent-3');
    });

    it('removes only the specified workflow execution', () => {
      const state: State = {
        ...initialState,
        workflowExecutions: [
          {
            executionId: 'exec-1',
            workflowId: 'workflow-1',
            currentStageIndex: 0,
            status: 'running',
            stageStates: [],
            initialPrompt: 'Prompt 1',
          },
          {
            executionId: 'exec-2',
            workflowId: 'workflow-2',
            currentStageIndex: 0,
            status: 'running',
            stageStates: [],
            initialPrompt: 'Prompt 2',
          },
        ],
      };

      const result = reducer(state, {
        type: 'REMOVE_WORKFLOW',
        executionId: 'exec-1',
        agentIds: [],
      });

      expect(result.workflowExecutions).toHaveLength(1);
      expect(result.workflowExecutions[0].executionId).toBe('exec-2');
    });

    it('handles empty agentIds array', () => {
      const agent1 = createMockAgent({ id: 'agent-1' });

      const state: State = {
        ...initialState,
        agents: [agent1],
        workflowExecutions: [
          {
            executionId: 'exec-1',
            workflowId: 'workflow-1',
            currentStageIndex: 0,
            status: 'completed',
            stageStates: [],
            initialPrompt: 'Test',
          },
        ],
      };

      const result = reducer(state, {
        type: 'REMOVE_WORKFLOW',
        executionId: 'exec-1',
        agentIds: [],
      });

      expect(result.workflowExecutions).toHaveLength(0);
      expect(result.agents).toHaveLength(1);
    });

    it('does not mutate the original state', () => {
      const agent1 = createMockAgent({ id: 'agent-1' });

      const state: State = {
        ...initialState,
        agents: [agent1],
        workflowExecutions: [
          {
            executionId: 'exec-1',
            workflowId: 'workflow-1',
            currentStageIndex: 0,
            status: 'running',
            stageStates: [{ stageId: 'stage-1', status: 'running', agentId: 'agent-1' }],
            initialPrompt: 'Test',
          },
        ],
      };

      reducer(state, {
        type: 'REMOVE_WORKFLOW',
        executionId: 'exec-1',
        agentIds: ['agent-1'],
      });

      expect(state.workflowExecutions).toHaveLength(1);
      expect(state.agents).toHaveLength(1);
    });
  });

  describe('default case', () => {
    it('returns the same state for unknown action types', () => {
      const state = { ...initialState, agents: [createMockAgent()] };

      // @ts-expect-error - testing unknown action type
      const result = reducer(state, { type: 'UNKNOWN_ACTION' });

      expect(result).toBe(state);
    });
  });
});
