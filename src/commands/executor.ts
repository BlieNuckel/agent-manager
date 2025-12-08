import { exec } from 'child_process';
import { promisify } from 'util';
import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

const execAsync = promisify(exec);

export class CommandExecutor {
	async execute(command: Command): Promise<CommandResult> {
		debug(`Executing command: ${command.id} (${command.type})`);

		try {
			switch (command.type) {
				case 'shell':
					return await this.executeShell(command);
				case 'typescript':
					return {
						success: false,
						message: 'TypeScript commands not yet implemented',
						error: 'Phase 2 feature',
					};
				case 'inline':
					return {
						success: false,
						message: 'Inline commands not yet implemented',
						error: 'Phase 2 feature',
					};
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

	private async executeShell(command: Command): Promise<CommandResult> {
		try {
			const { stdout, stderr } = await execAsync(command.script!, {
				shell: '/bin/bash',
				env: { ...process.env },
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
}
