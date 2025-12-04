import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export function getArtifactsDir(): string {
  const baseDir = join(homedir(), '.agent-manager');
  const artifactsDir = join(baseDir, 'artifacts');

  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }

  return artifactsDir;
}

export function generateArtifactFilename(agentTitle: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sanitizedTitle = agentTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return `${timestamp}_${sanitizedTitle}.md`;
}

export function getArtifactPath(filename: string): string {
  return join(getArtifactsDir(), filename);
}
