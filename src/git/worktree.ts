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

export function getRepoName(gitRoot: string): string {
  return path.basename(gitRoot);
}

export interface WorktreeCreateResult {
  success: boolean;
  worktreePath?: string;
  branchName?: string;
  error?: string;
}

export interface MergeTestResult {
  canMerge: boolean;
  hasConflicts: boolean;
  conflictFiles?: string[];
  error?: string;
}

export interface MergeResult {
  success: boolean;
  error?: string;
}

export function generateBranchName(taskDescription: string): string {
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'as', 'be', 'this', 'that', 'from', 'i', 'me', 'my', 'we', 'you', 'your', 'please', 'help', 'want', 'need', 'would', 'like', 'can', 'could', 'should', 'will', 'must']);

  const words = taskDescription
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word));

  const keywords = words.slice(0, 4);

  if (keywords.length === 0) {
    return `task-${Date.now().toString(36)}`;
  }

  return keywords.join('-');
}

export async function createWorktree(
  gitRoot: string,
  branchName: string,
  baseBranch: string
): Promise<WorktreeCreateResult> {
  const repoName = getRepoName(gitRoot);
  const worktreePath = path.join(path.dirname(gitRoot), `${repoName}-${branchName}`);

  try {
    debug('Creating worktree:', { gitRoot, branchName, baseBranch, worktreePath });

    execSync(
      `git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`,
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    debug('Worktree created successfully:', worktreePath);

    return {
      success: true,
      worktreePath,
      branchName
    };
  } catch (error: any) {
    debug('Failed to create worktree:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to create worktree'
    };
  }
}

export async function testMerge(
  gitRoot: string,
  branchName: string
): Promise<MergeTestResult> {
  try {
    debug('Testing merge viability:', { gitRoot, branchName });

    execSync(
      `git merge --no-commit --no-ff "${branchName}"`,
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const status = execSync(
      'git status --porcelain',
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const conflictPattern = /^(UU|AA|DD|AU|UA|DU|UD)/m;
    const hasConflicts = conflictPattern.test(status);

    let conflictFiles: string[] | undefined;
    if (hasConflicts) {
      conflictFiles = status
        .split('\n')
        .filter(line => conflictPattern.test(line))
        .map(line => line.substring(3).trim());
    }

    try {
      execSync('git merge --abort', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      execSync('git reset --hard HEAD', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    }

    debug('Merge test result:', { hasConflicts, conflictFiles });

    return {
      canMerge: !hasConflicts,
      hasConflicts,
      conflictFiles
    };
  } catch (error: any) {
    debug('Merge test failed:', error.message);

    try {
      execSync('git merge --abort', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      try {
        execSync('git reset --hard HEAD', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch {}
    }

    if (error.message?.includes('CONFLICT') || error.message?.includes('conflict')) {
      return {
        canMerge: false,
        hasConflicts: true,
        error: error.message
      };
    }

    return {
      canMerge: false,
      hasConflicts: false,
      error: error.message || 'Failed to test merge'
    };
  }
}

export async function performMerge(
  gitRoot: string,
  branchName: string,
  commitMessage: string
): Promise<MergeResult> {
  try {
    debug('Performing merge:', { gitRoot, branchName, commitMessage });

    execSync(
      `git merge --no-ff "${branchName}" -m "${commitMessage.replace(/"/g, '\\"')}"`,
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    debug('Merge completed successfully');

    return { success: true };
  } catch (error: any) {
    debug('Merge failed:', error.message);

    try {
      execSync('git merge --abort', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {}

    return {
      success: false,
      error: error.message || 'Failed to perform merge'
    };
  }
}

export async function cleanupWorktree(
  worktreePath: string,
  branchName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    debug('Cleaning up worktree:', { worktreePath, branchName });

    const gitRoot = getGitRoot();
    if (!gitRoot) {
      return { success: false, error: 'Not in a git repository' };
    }

    try {
      execSync(
        `git worktree remove "${worktreePath}"`,
        { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch (error: any) {
      execSync(
        `git worktree remove --force "${worktreePath}"`,
        { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    }

    try {
      execSync(
        `git branch -d "${branchName}"`,
        { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch (error: any) {
      debug('Warning: Could not delete branch (may already be deleted or merged):', error.message);
    }

    debug('Worktree cleanup completed successfully');

    return { success: true };
  } catch (error: any) {
    debug('Worktree cleanup failed:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to cleanup worktree'
    };
  }
}
