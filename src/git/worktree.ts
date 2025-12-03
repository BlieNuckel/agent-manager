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

export function generateWorktreeName(): string {
  const adjectives = ['swift', 'brave', 'calm', 'keen', 'bold', 'wise', 'fair', 'warm'];
  const nouns = ['fox', 'owl', 'bear', 'wolf', 'hawk', 'deer', 'lion', 'dove'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
}

export function createWorktree(name: string): { success: boolean; path: string; error?: string } {
  const gitRoot = getGitRoot();
  if (!gitRoot) return { success: false, path: '', error: 'Not in a git repository' };

  const worktreePath = path.join(path.dirname(gitRoot), name);
  const branch = getCurrentBranch();

  try {
    execSync(`git worktree add -b ${name} "${worktreePath}" ${branch}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, path: worktreePath };
  } catch (e: any) {
    return { success: false, path: '', error: e.message };
  }
}

export function attemptAutoMerge(worktreeName: string, gitRoot: string): { success: boolean; conflict: boolean; error?: string } {
  const branch = getCurrentBranch();

  try {
    execSync(`git merge --no-commit --no-ff ${worktreeName}`, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const status = execSync('git status --porcelain', {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (status.includes('UU ') || status.includes('AA ') || status.includes('DD ')) {
      execSync('git merge --abort', {
        cwd: gitRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { success: false, conflict: true, error: 'Merge conflicts detected' };
    }

    execSync(`git commit -m "Auto-merge worktree: ${worktreeName}"`, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return { success: true, conflict: false };
  } catch (e: any) {
    try {
      execSync('git merge --abort', {
        cwd: gitRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {}

    if (e.message.includes('CONFLICT') || e.message.includes('conflict')) {
      return { success: false, conflict: true, error: 'Merge conflicts detected' };
    }

    return { success: false, conflict: false, error: e.message };
  }
}

export function cleanupWorktree(worktreeName: string, gitRoot: string): void {
  const worktreePath = path.join(path.dirname(gitRoot), worktreeName);

  try {
    execSync(`git worktree remove "${worktreePath}"`, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    execSync(`git branch -d ${worktreeName}`, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e: any) {
    debug('Worktree cleanup error:', e.message);
  }
}
