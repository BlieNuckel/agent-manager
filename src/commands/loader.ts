import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import toml from '@iarna/toml';
import type { Command, CommandConfig } from './types';
import { debug } from '../utils/logger';

const COMMANDS_FILE = path.join(os.homedir(), '.agent-manager', 'commands.toml');

export class CommandLoader {
	private cache: Command[] | null = null;
	private lastModified: number = 0;

	private getBuiltinCommands(): Command[] {
		return [
			{
				id: 'repo-ls',
				name: 'repo-ls',
				description: 'List all registered repositories',
				category: 'repository',
				type: 'inline',
			},
			{
				id: 'repo-add',
				name: 'repo-add',
				description: 'Add a new repository',
				category: 'repository',
				type: 'inline',
				args: [
					{ name: 'name', description: 'Repository name', required: true, type: 'string' },
					{ name: 'path', description: 'Repository path', required: true, type: 'path' },
				],
			},
			{
				id: 'repo-remove',
				name: 'repo-remove',
				description: 'Remove a repository',
				category: 'repository',
				type: 'inline',
				args: [
					{ name: 'name', description: 'Repository name', required: true, type: 'string' },
				],
			},
			{
				id: 'repo-default',
				name: 'repo-default',
				description: 'Set the default repository',
				category: 'repository',
				type: 'inline',
				args: [
					{ name: 'name', description: 'Repository name', required: true, type: 'string' },
				],
			},
			{
				id: 'clearworktrees',
				name: 'clearworktrees',
				description: 'Clear all worktrees and their connected directories and branches',
				category: 'maintenance',
				type: 'inline',
				confirm_before_run: true,
			},
		];
	}

	async loadCommands(forceReload = false): Promise<Command[]> {
		try {
			const stats = await fs.stat(COMMANDS_FILE);
			const modified = stats.mtimeMs;

			if (!forceReload && this.cache && modified === this.lastModified) {
				debug('Using cached commands');
				return [...this.getBuiltinCommands(), ...this.cache];
			}

			debug(`Loading commands from ${COMMANDS_FILE}`);
			const content = await fs.readFile(COMMANDS_FILE, 'utf-8');
			const config = toml.parse(content) as unknown as CommandConfig;

			this.validateCommands(config.command || []);

			this.cache = config.command || [];
			this.lastModified = modified;

			const allCommands = [...this.getBuiltinCommands(), ...this.cache];
			debug(`Loaded ${allCommands.length} command(s) (${this.getBuiltinCommands().length} builtin)`);
			return allCommands;
		} catch (error) {
			if ((error as any).code === 'ENOENT') {
				debug('Commands file not found, creating default config');
				await this.createDefaultConfig();
				return this.loadCommands(true);
			}
			debug(`Error loading commands: ${error}`);
			throw error;
		}
	}

	private validateCommands(commands: Command[]): void {
		const ids = new Set<string>();

		for (const cmd of commands) {
			if (!cmd.id || !cmd.name || !cmd.type) {
				throw new Error(`Invalid command: missing required fields (id, name, or type)`);
			}

			if (ids.has(cmd.id)) {
				throw new Error(`Duplicate command ID: ${cmd.id}`);
			}

			ids.add(cmd.id);

			if (cmd.type === 'typescript' && !cmd.script) {
				throw new Error(`TypeScript command ${cmd.id} must have a script path`);
			}

			if (cmd.type === 'inline' && !cmd.code) {
				throw new Error(`Inline command ${cmd.id} must have code`);
			}

			if (cmd.type === 'shell' && !cmd.script) {
				throw new Error(`Shell command ${cmd.id} must have a script`);
			}
		}

		debug(`Validated ${commands.length} command(s)`);
	}

	private async createDefaultConfig(): Promise<void> {
		const defaultConfig = `# Agent Manager Custom Commands Configuration
version = "1.0"

# Example: Clear artifacts
[[command]]
id = "clear-artifacts"
name = "Clear Artifacts"
description = "Remove all cached artifacts from ~/.agent-manager/artifacts"
category = "maintenance"
type = "shell"
script = "rm -rf ~/.agent-manager/artifacts/* && echo '✓ Artifacts cleared'"

# Example: Show history
[[command]]
id = "show-history"
name = "Show History"
description = "Display the command history file"
category = "info"
type = "shell"
script = "cat ~/.agent-manager/history.json | jq '.'"

# Add your custom commands below
`;

		const dir = path.dirname(COMMANDS_FILE);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(COMMANDS_FILE, defaultConfig);
		debug(`Created default commands file at ${COMMANDS_FILE}`);
	}

	getCommandsFilePath(): string {
		return COMMANDS_FILE;
	}
}
