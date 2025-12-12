import type { State, Action } from '../types';

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_AGENT':
      return { ...state, agents: [...state.agents, action.agent] };
    case 'UPDATE_AGENT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id ? { ...a, ...action.updates, updatedAt: new Date() } : a
        ),
      };
    case 'UPDATE_AGENT_TITLE':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id ? { ...a, title: action.title, updatedAt: new Date() } : a
        ),
      };
    case 'REMOVE_AGENT':
      return { ...state, agents: state.agents.filter(a => a.id !== action.id) };
    case 'APPEND_OUTPUT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? {
                ...a,
                output: [
                  ...a.output.slice(-500),
                  { ...action.line, timestamp: action.timestamp ?? Date.now() }
                ],
                updatedAt: new Date()
              }
            : a
        ),
      };
    case 'SET_PERMISSION':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? { ...a, pendingPermission: action.permission, status: action.permission ? 'waiting' : (a.permissionQueue.length > 0 ? 'waiting' : 'working') }
            : a
        ),
      };
    case 'QUEUE_PERMISSION':
      return {
        ...state,
        agents: state.agents.map(a => {
          if (a.id !== action.id) return a;
          if (!a.pendingPermission) {
            return { ...a, pendingPermission: action.permission, status: 'waiting' as const };
          }
          return { ...a, permissionQueue: [...a.permissionQueue, action.permission], status: 'waiting' as const };
        }),
      };
    case 'DEQUEUE_PERMISSION':
      return {
        ...state,
        agents: state.agents.map(a => {
          if (a.id !== action.id) return a;
          const [nextPermission, ...remainingQueue] = a.permissionQueue;
          return {
            ...a,
            pendingPermission: nextPermission,
            permissionQueue: remainingQueue,
            status: nextPermission ? 'waiting' as const : 'working' as const
          };
        }),
      };
    case 'SET_QUESTION':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? { ...a, pendingQuestion: action.question, status: action.question ? 'waiting' : 'working' }
            : a
        ),
      };
    case 'SET_MERGE_STATE':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? { ...a, pendingMerge: action.mergeState }
            : a
        ),
      };
    case 'REMOVE_HISTORY':
      return { ...state, history: state.history.filter((_, i) => i !== action.index) };
    case 'UPDATE_HISTORY_TITLE':
      return {
        ...state,
        history: state.history.map(h =>
          h.id === action.id ? { ...h, title: action.title } : h
        ),
      };
    case 'SET_ARTIFACTS':
      return { ...state, artifacts: action.artifacts };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.templates };
    case 'UPDATE_TOKEN_USAGE':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? { ...a, tokenUsage: action.tokenUsage, updatedAt: new Date() }
            : a
        ),
      };
    default:
      return state;
  }
}
