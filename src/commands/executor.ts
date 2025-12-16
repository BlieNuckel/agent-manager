import { exec } from 'child_process';
import { promisify } from 'util';
import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

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
}
