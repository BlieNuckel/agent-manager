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

export function generateWorktreeName(taskDescription: string): string {
  const words = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 6);

  return words.join('-') || 'new-worktree';
}
