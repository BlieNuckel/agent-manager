import { execSync } from 'child_process';
import * as path from 'path';
import { debug } from '../utils/logger';

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

function generateWorktreeName(taskDescription: string): string {
  const words = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 4);

  return words.join('-') || 'new-worktree';
}

export async function createWorktreeWithAgent(
  taskDescription: string,
  suggestedName?: string
): Promise<{ success: boolean; path: string; error?: string; name: string }> {
  debug('createWorktreeWithAgent called:', { taskDescription, suggestedName });

  const gitRoot = getGitRoot();
  if (!gitRoot) {
    debug('Not in a git repository');
    return { success: false, path: '', error: 'Not in a git repository', name: '' };
  }
  debug('Git root:', gitRoot);

  const currentBranch = getCurrentBranch();
  const branchName = suggestedName || generateWorktreeName(taskDescription);

  const gitRootBase = path.basename(gitRoot);
  const parentDir = path.dirname(gitRoot);
  const worktreePath = path.join(parentDir, `${gitRootBase}-${branchName}`);

  debug('Creating worktree:', { branchName, worktreePath, currentBranch });

  try {
    execSync(`git worktree add -b "${branchName}" "${worktreePath}" "${currentBranch}"`, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    debug('Worktree creation successful');
    return { success: true, path: worktreePath, name: branchName };
  } catch (e: any) {
    debug('Exception in createWorktreeWithAgent:', e);
    return {
      success: false,
      path: '',
      error: e.message || 'Failed to create worktree',
      name: ''
    };
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
  debug('attemptAutoMergeWithAgent called:', { worktreeName, gitRoot, autoConfirm });

  try {
    const currentBranch = getCurrentBranch();
    debug('Current branch:', currentBranch);

    try {
      execSync(`git merge --no-commit --no-ff "${worktreeName}"`, {
        cwd: gitRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      debug('Test merge successful, checking status');

      const status = execSync('git status --porcelain', {
        cwd: gitRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const hasConflicts = status.split('\n').some(line => {
        const prefix = line.substring(0, 2);
        return prefix === 'UU' || prefix === 'AA' || prefix === 'DD';
      });

      execSync('git merge --abort', {
        cwd: gitRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (hasConflicts) {
        debug('Merge conflicts detected');
        const conflictFiles = status
          .split('\n')
          .filter(line => {
            const prefix = line.substring(0, 2);
            return prefix === 'UU' || prefix === 'AA' || prefix === 'DD';
          })
          .map(line => line.substring(3))
          .join(', ');

        return {
          success: false,
          conflict: true,
          error: `Conflicting files: ${conflictFiles}`
        };
      }

      if (autoConfirm) {
        debug('Auto-confirm enabled, performing merge');

        execSync(`git merge --no-ff -m "Merge worktree: ${worktreeName}" "${worktreeName}"`, {
          cwd: gitRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const worktrees = execSync('git worktree list --porcelain', {
          cwd: gitRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const worktreeMatch = worktrees.match(new RegExp(`worktree ([^\\n]+)\\nbranch [^\\n]*${worktreeName}`));
        if (worktreeMatch) {
          const worktreePath = worktreeMatch[1];
          execSync(`git worktree remove "${worktreePath}"`, {
            cwd: gitRoot,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
        }

        execSync(`git branch -d "${worktreeName}"`, {
          cwd: gitRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        debug('Merge and cleanup successful');
        return { success: true, conflict: false };
      } else {
        debug('No conflicts, but awaiting user confirmation');
        return { success: false, conflict: false, needsConfirmation: true };
      }
    } catch (e: any) {
      if (e.message.includes('CONFLICT')) {
        try {
          execSync('git merge --abort', {
            cwd: gitRoot,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch {}

        debug('Merge conflicts detected from error');
        return {
          success: false,
          conflict: true,
          error: 'Merge conflicts detected. Manual merge required.'
        };
      }

      throw e;
    }
  } catch (e: any) {
    debug('Exception in attemptAutoMergeWithAgent:', e);
    return {
      success: false,
      conflict: false,
      error: e.message || 'Failed to merge'
    };
  }
}
