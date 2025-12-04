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
            ? { ...a, output: [...a.output.slice(-500), action.line], updatedAt: new Date() }
            : a
        ),
      };
    case 'SET_PERMISSION':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? { ...a, pendingPermission: action.permission, status: action.permission ? 'waiting' : 'working' }
            : a
        ),
      };
    case 'SAVE_ARTIFACT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id ? { ...a, artifact: action.artifact, updatedAt: new Date() } : a
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
    default:
      return state;
  }
}
