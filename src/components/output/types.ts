import type { OutputLine, SubagentStats } from '../../types';

export type OutputBlockData =
  | { type: 'messages'; id: string; lines: string[] }
  | { type: 'subagent'; id: string; toolUseId: string; subagentType: string; status: 'running' | 'completed'; output: OutputLine[]; stats?: SubagentStats }
  | { type: 'tool-group'; id: string; count: number; lines: string[] }
  | { type: 'status'; id: string; line: string; variant: 'error' | 'success' | 'warning' }
  | { type: 'user-input'; id: string; text: string };
