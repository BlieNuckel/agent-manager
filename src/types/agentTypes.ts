export interface AgentToolConfig {
  allow?: string[];
  deny?: string[];
  bashAllow?: string[];
  bashDeny?: string[];
}

export interface AgentArtifactConfig {
  produces: string;
  compatibleOutputs?: string[];
  consumes?: string[];
}

export interface CustomAgentType {
  id: string;
  name: string;
  description: string;
  version?: number;
  source: 'system' | 'user';
  path: string;

  tools?: AgentToolConfig;
  artifacts?: AgentArtifactConfig;
  model?: 'opus' | 'sonnet' | 'haiku';
  worktree?: boolean;

  systemPrompt: string;
}

export interface CustomAgentTypeFrontmatter {
  id: string;
  name: string;
  description: string;
  version?: number;
  tools?: AgentToolConfig;
  artifacts?: AgentArtifactConfig;
  model?: 'opus' | 'sonnet' | 'haiku';
  worktree?: boolean;
}
