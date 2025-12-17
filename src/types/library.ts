import type { CustomAgentType } from './agentTypes';
import type { Template } from './templates';
import type { Workflow } from './workflows';

export type LibraryItemType = 'agent' | 'template' | 'workflow';
export type LibraryItemSource = 'system' | 'user' | 'project';

export interface LibraryItem {
  id: string;
  name: string;
  description: string;
  type: LibraryItemType;
  source: LibraryItemSource;
  path: string;
  data: CustomAgentType | Template | Workflow;
}

export interface LibraryFilters {
  types: Set<LibraryItemType>;
  sources: Set<LibraryItemSource>;
}