import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { RepositoryManager } from '../utils/repositoryManager';
import { getGitRoot, listAllWorktrees } from '../git/worktree';

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

			if (command.id === 'clearworktrees') {
				return await this.executeClearWorktrees();
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

	private async executeClearWorktrees(): Promise<CommandResult> {
		try {
			const gitRoot = getGitRoot();
			if (!gitRoot) {
				return {
					success: false,
					message: 'Not in a git repository',
					error: 'No git repository found',
				};
			}

			const worktrees = listAllWorktrees(gitRoot);

			if (worktrees.length === 0) {
				return {
					success: true,
					message: 'No worktrees found to clean up',
				};
			}

			debug(`Found ${worktrees.length} worktree(s) to clean up`);

			let cleanedCount = 0;
			let failedCount = 0;
			const errors: string[] = [];

			for (const worktree of worktrees) {
				debug(`Cleaning up worktree: ${worktree.path} (branch: ${worktree.branch})`);

				try {
					// Remove the worktree
					execSync(`git worktree remove --force "${worktree.path}"`, {
						cwd: gitRoot,
						encoding: 'utf8',
						stdio: ['pipe', 'pipe', 'pipe']
					});

					// Delete the branch
					try {
						execSync(`git branch -D "${worktree.branch}"`, {
							cwd: gitRoot,
							encoding: 'utf8',
							stdio: ['pipe', 'pipe', 'pipe']
						});
					} catch (branchError) {
						// Branch might already be deleted or merged, which is OK
						debug(`Could not delete branch ${worktree.branch}:`, branchError);
					}

					cleanedCount++;
				} catch (error: any) {
					failedCount++;
					errors.push(`${worktree.path}: ${error.message}`);
					debug(`Failed to clean up worktree ${worktree.path}:`, error);
				}
			}

			if (failedCount === 0) {
				return {
					success: true,
					message: `Successfully cleaned up ${cleanedCount} worktree(s)`,
				};
			} else if (cleanedCount > 0) {
				return {
					success: true,
					message: `Cleaned up ${cleanedCount} worktree(s), ${failedCount} failed`,
					error: errors.join('\n'),
				};
			} else {
				return {
					success: false,
					message: `Failed to clean up all ${failedCount} worktree(s)`,
					error: errors.join('\n'),
				};
			}
		} catch (error: any) {
			debug('Error in clearworktrees:', error);
			return {
				success: false,
				message: 'Failed to clear worktrees',
				error: error.message,
			};
		}
	}
}
