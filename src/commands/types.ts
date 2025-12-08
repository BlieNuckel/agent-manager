import type { Agent, HistoryEntry } from '../types';

export interface CommandConfig {
	version: string;
	command: Command[];
	categories?: Record<string, CategoryInfo>;
}

export interface Command {
	id: string;
	name: string;
	description: string;
	category?: string;
	type: 'shell' | 'typescript' | 'inline';
	script?: string;
	code?: string;
	requires_api?: boolean;
	confirm_before_run?: boolean;
	hidden?: boolean;
}

export interface CategoryInfo {
	icon?: string;
	description: string;
}

export interface CommandResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

export interface ArtifactInfo {
	name: string;
	path: string;
	size: number;
	modified: Date;
}

export interface WorktreeInfo {
	path: string;
	branch: string;
	commit: string;
}

export interface CreateAgentOptions {
	prompt: string;
	workDir?: string;
	useWorktree?: boolean;
	agentType?: string;
	model?: string;
}

export interface PromptOptions {
	default?: string;
	validate?: (input: string) => boolean | string;
}

export interface CommandAPI {
	getAgents(): Promise<Agent[]>;
	getAgent(id: string): Promise<Agent | undefined>;
	killAgent(id: string): Promise<void>;
	createAgent(options: CreateAgentOptions): Promise<string>;

	getHistory(): Promise<HistoryEntry[]>;
	clearHistory(): Promise<void>;

	listArtifacts(): Promise<ArtifactInfo[]>;
	getArtifactPath(name: string): Promise<string | null>;

	getGitRoot(): string | null;
	getCurrentBranch(): string;
	listWorktrees(): Promise<WorktreeInfo[]>;

	log(message: string, level?: 'info' | 'warn' | 'error'): void;
	prompt(message: string, options?: PromptOptions): Promise<string>;
	confirm(message: string): Promise<boolean>;

	readonly workingDirectory: string;
}
