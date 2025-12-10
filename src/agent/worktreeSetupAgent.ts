import { query } from '@anthropic-ai/claude-agent-sdk';
import { debug } from '../utils/logger';

export interface WorktreeSetupResult {
  success: boolean;
  worktreePath?: string;
  branchName?: string;
  error?: string;
}

export interface WorktreeSetupOptions {
  gitRoot: string;
  repoName: string;
  baseBranch: string;
  taskDescription: string;
  suggestedBranchName?: string;
}

const WORKTREE_SETUP_PROMPT = `You are a focused git worktree setup agent. Your ONLY job is to:

1. Generate a good branch name from the task description (2-4 words, kebab-case)
2. Create a git worktree with that branch
3. Output the result

## Rules
- Branch names should be descriptive but concise: "add-user-auth", "fix-login-bug", "refactor-api-routes"
- Use the suggested branch name if provided, otherwise generate from task
- Output EXACTLY ONE line at the end: [WORKTREE_PATH] /absolute/path/to/worktree
- If there's an error, output: [WORKTREE_ERROR] description of error

## Context
- Git Root: {gitRoot}
- Repository Name: {repoName}
- Base Branch: {baseBranch}
- Suggested Branch Name: {suggestedBranchName}
- Worktree Location Pattern: {gitRoot}/../{repoName}-<branch-name>

## Task Description
{taskDescription}

## Instructions
1. Determine branch name (use suggested if provided, otherwise generate from task)
2. Run: git worktree add -b "<branch>" "<path>" "{baseBranch}"
3. Output the result line

Start now.`;

export async function createWorktreeWithAgent(
  options: WorktreeSetupOptions
): Promise<WorktreeSetupResult> {
  const abortController = new AbortController();

  const prompt = WORKTREE_SETUP_PROMPT
    .replace(/{gitRoot}/g, options.gitRoot)
    .replace(/{repoName}/g, options.repoName)
    .replace(/{baseBranch}/g, options.baseBranch)
    .replace(/{suggestedBranchName}/g, options.suggestedBranchName || '(none - generate from task)')
    .replace(/{taskDescription}/g, options.taskDescription);

  debug('Starting worktree setup agent');

  let worktreePath: string | undefined;
  let branchName: string | undefined;
  let error: string | undefined;

  try {
    const q = query({
      prompt,
      options: {
        cwd: options.gitRoot,
        abortController,
        model: 'haiku',
        permissionMode: 'acceptEdits',
        maxTurns: 5,
      },
    });

    for await (const message of q) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            const pathMatch = content.text.match(/\[WORKTREE_PATH\]\s*(.+)/);
            if (pathMatch) {
              worktreePath = pathMatch[1].trim();
              const pathParts = worktreePath.split('/');
              const dirName = pathParts[pathParts.length - 1];
              branchName = dirName.replace(`${options.repoName}-`, '');
              debug('Worktree created:', { worktreePath, branchName });
            }

            const errorMatch = content.text.match(/\[WORKTREE_ERROR\]\s*(.+)/);
            if (errorMatch) {
              error = errorMatch[1].trim();
              debug('Worktree setup error:', error);
            }
          }
        }
      }

      if (message.type === 'user' && (message as any).tool_use_result) {
        const result = (message as any).tool_use_result;
        const resultStr = typeof result === 'string' ? result : (result?.stdout || '');

        const pathMatch = resultStr.match(/\[WORKTREE_PATH\]\s*(.+)/);
        if (pathMatch) {
          const extractedPath = pathMatch[1].trim();
          worktreePath = extractedPath;
          const pathParts = extractedPath.split('/');
          const dirName = pathParts[pathParts.length - 1];
          branchName = dirName.replace(`${options.repoName}-`, '');
          debug('Worktree created (from tool result):', { worktreePath, branchName });
        }

        const errorMatch = resultStr.match(/\[WORKTREE_ERROR\]\s*(.+)/);
        if (errorMatch) {
          error = errorMatch[1].trim();
          debug('Worktree setup error (from tool result):', error);
        }
      }
    }

    abortController.abort();

    if (worktreePath && branchName) {
      return { success: true, worktreePath, branchName };
    } else if (error) {
      return { success: false, error };
    } else {
      return { success: false, error: 'Worktree setup agent did not produce expected output' };
    }

  } catch (err: any) {
    debug('Worktree setup agent failed:', err);
    abortController.abort();
    return { success: false, error: err.message || 'Unknown error during worktree setup' };
  }
}

export async function createWorktreeWithTimeout(
  options: WorktreeSetupOptions,
  timeoutMs: number = 30000
): Promise<WorktreeSetupResult> {
  return Promise.race([
    createWorktreeWithAgent(options),
    new Promise<WorktreeSetupResult>((resolve) =>
      setTimeout(() => resolve({
        success: false,
        error: 'Worktree setup timed out'
      }), timeoutMs)
    )
  ]);
}
