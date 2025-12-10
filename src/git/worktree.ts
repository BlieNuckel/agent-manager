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

export interface WorktreeResult {
  success: boolean;
  worktreePath?: string;
  branchName?: string;
  error?: string;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'and', 'or', 'but', 'if', 'then', 'so', 'that', 'this', 'it',
  'i', 'you', 'we', 'they', 'he', 'she', 'me', 'us', 'them',
  'my', 'your', 'our', 'their', 'his', 'her', 'its',
  'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
  'have', 'has', 'had', 'do', 'does', 'did', 'please', 'help',
  'want', 'need', 'like', 'make', 'some', 'any', 'all', 'each',
]);

export function generateBranchName(taskDescription: string): string {
  const cleaned = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word))
    .slice(0, 4)
    .join('-');

  if (cleaned.length < 3) {
    return `task-${Date.now().toString(36)}`;
  }

  return cleaned.substring(0, 50);
}

export function createWorktreeProgrammatic(
  gitRoot: string,
  branchName: string,
  baseBranch: string,
  repoName: string
): WorktreeResult {
  const worktreePath = path.join(path.dirname(gitRoot), `${repoName}-${branchName}`);

  try {
    execSync(
      `git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`,
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    debug('Worktree created programmatically:', { worktreePath, branchName });
    return { success: true, worktreePath, branchName };
  } catch (err: any) {
    const errorMessage = err.stderr || err.message || 'Unknown error';
    debug('Programmatic worktree creation failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
