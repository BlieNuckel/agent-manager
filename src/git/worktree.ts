import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { debug } from '../utils/logger';
import { query } from '@anthropic-ai/claude-agent-sdk';

export function getGitRoot(): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return 'main';
  }
}

interface WorktreeAgent {
  abort: () => void;
  run: () => Promise<{ success: boolean; path?: string; error?: string }>;
}

export async function createWorktreeWithAgent(
  taskDescription: string,
  suggestedName?: string
): Promise<{ success: boolean; path: string; error?: string; name: string }> {
  const gitRoot = getGitRoot();
  if (!gitRoot) return { success: false, path: '', error: 'Not in a git repository', name: '' };

  const promptPath = path.join(gitRoot, '.claude', 'prompts', 'worktree-agent.md');
  let worktreePrompt = '';

  try {
    if (fs.existsSync(promptPath)) {
      worktreePrompt = fs.readFileSync(promptPath, 'utf8');
    }
  } catch (e) {
    debug('Could not load worktree agent prompt:', e);
  }

  const prompt = `${worktreePrompt}

## Task

Create a new git worktree for the following task:
${taskDescription}

${suggestedName ? `Suggested name: ${suggestedName}` : 'Please generate a sensible name based on the task description.'}

Instructions:
1. Check the current git repository status
2. ${suggestedName ? `Use the name "${suggestedName}"` : 'Generate a descriptive kebab-case name (2-4 words) based on the task'}
3. Create the worktree in a sibling directory to the current repository
4. Report back with [SUCCESS] and the worktree path, or [ERROR] if something fails

Current repository: ${gitRoot}`;

  const abortController = new AbortController();

  try {
    const q = query({
      prompt,
      options: {
        cwd: gitRoot,
        abortController,
      },
    });

    let worktreePath = '';
    let worktreeName = suggestedName || '';
    let error = '';

    for await (const message of q) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            const text = content.text;

            if (text.includes('[SUCCESS]')) {
              const pathMatch = text.match(/path[:\s]+([^\s\n]+)/i);
              if (pathMatch) {
                worktreePath = pathMatch[1];
              }

              if (!worktreeName) {
                const nameMatch = text.match(/(?:name|branch)[:\s]+([^\s\n]+)/i);
                if (nameMatch) {
                  worktreeName = nameMatch[1];
                }
              }
            } else if (text.includes('[ERROR]')) {
              const errorMatch = text.match(/\[ERROR\]\s*(.+)/i);
              if (errorMatch) {
                error = errorMatch[1];
              }
            }
          }
        }
      }
    }

    if (worktreePath && worktreeName) {
      return { success: true, path: worktreePath, name: worktreeName };
    } else if (error) {
      return { success: false, path: '', error, name: '' };
    } else {
      return { success: false, path: '', error: 'Agent did not report success or failure', name: '' };
    }
  } catch (e: any) {
    abortController.abort();
    return { success: false, path: '', error: e.message, name: '' };
  }
}

interface MergeResult {
  success: boolean;
  conflict: boolean;
  error?: string;
  needsConfirmation?: boolean;
}

export async function attemptAutoMergeWithAgent(
  worktreeName: string,
  gitRoot: string,
  autoConfirm: boolean = false
): Promise<MergeResult> {
  const promptPath = path.join(gitRoot, '.claude', 'prompts', 'worktree-agent.md');
  let worktreePrompt = '';

  try {
    if (fs.existsSync(promptPath)) {
      worktreePrompt = fs.readFileSync(promptPath, 'utf8');
    }
  } catch (e) {
    debug('Could not load worktree agent prompt:', e);
  }

  const prompt = `${worktreePrompt}

## Task

Check if the worktree branch "${worktreeName}" can be merged without conflicts, and ${autoConfirm ? 'if yes, merge it automatically' : 'report the status'}.

Instructions:
1. Check for merge conflicts by attempting a test merge
2. If conflicts exist, report [CONFLICT] with the list of conflicting files
3. If no conflicts exist:
   ${autoConfirm ?
     '- Perform the merge with message "Merge worktree: ' + worktreeName + '"' +
     '\n   - Clean up the worktree and delete the branch' +
     '\n   - Report [MERGED] when complete' :
     '- Abort the test merge\n   - Report [READY_TO_MERGE]'
   }

Current repository: ${gitRoot}
Branch to merge: ${worktreeName}`;

  const abortController = new AbortController();

  try {
    const q = query({
      prompt,
      options: {
        cwd: gitRoot,
        abortController,
      },
    });

    let hasConflict = false;
    let merged = false;
    let error = '';
    let readyToMerge = false;

    for await (const message of q) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            const text = content.text;

            if (text.includes('[CONFLICT]')) {
              hasConflict = true;
              const errorMatch = text.match(/\[CONFLICT\]\s*(.+)/i);
              if (errorMatch) {
                error = errorMatch[1];
              }
            } else if (text.includes('[MERGED]')) {
              merged = true;
            } else if (text.includes('[READY_TO_MERGE]')) {
              readyToMerge = true;
            } else if (text.includes('[ERROR]')) {
              const errorMatch = text.match(/\[ERROR\]\s*(.+)/i);
              if (errorMatch) {
                error = errorMatch[1];
              }
            }
          }
        }
      }
    }

    if (hasConflict) {
      return { success: false, conflict: true, error: error || 'Merge conflicts detected' };
    } else if (merged) {
      return { success: true, conflict: false };
    } else if (readyToMerge) {
      return { success: false, conflict: false, needsConfirmation: true };
    } else if (error) {
      return { success: false, conflict: false, error };
    } else {
      return { success: false, conflict: false, error: 'Agent did not report merge status' };
    }
  } catch (e: any) {
    abortController.abort();
    return { success: false, conflict: false, error: e.message };
  }
}
