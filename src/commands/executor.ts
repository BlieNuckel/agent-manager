import { exec } from 'child_process';
import { promisify } from 'util';
import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { RepositoryManager } from '../utils/repositoryManager';

const execAsync = promisify(exec);

export class CommandExecutor {
	async execute(command: Command, args: string[] = []): Promise<CommandResult> {
		debug(`Executing command: ${command.id} (${command.type}) with args:`, args);

		try {
			switch (command.type) {
				case 'shell':
					return await this.executeShell(command, args);
				case 'typescript':
					return {
						success: false,
						message: 'TypeScript commands not yet implemented',
						error: 'Phase 2 feature',
					};
				case 'inline':
					return await this.executeInline(command, args);
				default:
					throw new Error(`Unknown command type: ${(command as any).type}`);
			}
		} catch (error) {
			debug(`Command execution failed: ${error}`);
			return {
				success: false,
				message: 'Command execution failed',
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async executeShell(command: Command, args: string[]): Promise<CommandResult> {
		try {
			// Replace placeholders in the script with arguments
			let script = command.script!;

			// Replace positional placeholders like $1, $2, etc.
			args.forEach((arg, index) => {
				script = script.replace(new RegExp(`\\$${index + 1}`, 'g'), arg);
			});

			// Also set them as environment variables
			const env: Record<string, string | undefined> = { ...process.env };
			args.forEach((arg, index) => {
				env[`ARG_${index + 1}`] = arg;
			});

			const { stdout, stderr } = await execAsync(script, {
				shell: '/bin/bash',
				env,
			});

			if (stderr && !stdout) {
				return {
					success: false,
					message: stderr.trim(),
					error: stderr.trim(),
				};
			}

			return {
				success: true,
				message: stdout.trim() || 'Command completed',
				error: stderr ? stderr.trim() : undefined,
			};
		} catch (error: any) {
			return {
				success: false,
				message: error.stdout?.trim() || 'Command failed',
				error: error.stderr?.trim() || error.message,
			};
		}
	}

	private async executeInline(command: Command, args: string[]): Promise<CommandResult> {
		try {
			if (command.id.startsWith('repo-')) {
				return await this.executeRepoCommand(command.id, args);
			}

			return {
				success: false,
				message: 'Unknown inline command',
				error: `No handler for inline command: ${command.id}`,
			};
		} catch (error: any) {
			return {
				success: false,
				message: error.message || 'Inline command failed',
				error: error.message,
			};
		}
	}

	private async executeRepoCommand(commandId: string, args: string[]): Promise<CommandResult> {
		try {
			switch (commandId) {
				case 'repo-ls': {
					const config = await RepositoryManager.loadRepositories();
					if (config.repositories.length === 0) {
						return {
							success: true,
							message: 'No repositories registered.\nUse "repo-add <name> <path>" to add one.',
						};
					}
					const message = config.repositories.map(r =>
						`${r.isDefault ? '* ' : '  '}${r.name} → ${r.path}`
					).join('\n');
					return {
						success: true,
						message,
					};
				}

				case 'repo-add': {
					if (args.length < 2) {
						return {
							success: false,
							message: 'Usage: repo-add <name> <path>',
							error: 'Missing required arguments',
						};
					}
					const name = args[0];
					const repoPath = args.slice(1).join(' ');
					await RepositoryManager.addRepository(name, repoPath);
					return {
						success: true,
						message: `Repository '${name}' added successfully.`,
					};
				}

				case 'repo-remove': {
					if (args.length < 1) {
						return {
							success: false,
							message: 'Usage: repo-remove <name>',
							error: 'Missing required argument: name',
						};
					}
					const name = args[0];
					await RepositoryManager.removeRepository(name);
					return {
						success: true,
						message: `Repository '${name}' removed.`,
					};
				}

				case 'repo-default': {
					if (args.length < 1) {
						return {
							success: false,
							message: 'Usage: repo-default <name>',
							error: 'Missing required argument: name',
						};
					}
					const name = args[0];
					await RepositoryManager.setDefaultRepository(name);
					return {
						success: true,
						message: `Repository '${name}' set as default.`,
					};
				}

				default:
					return {
						success: false,
						message: `Unknown repo command: ${commandId}`,
						error: 'Invalid command',
					};
			}
		} catch (error: any) {
			return {
				success: false,
				message: `Error: ${error.message}`,
				error: error.message,
			};
		}
	}
}
