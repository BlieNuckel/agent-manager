import fs from 'fs';
import path from 'path';
import os from 'os';

export function getArtifactsDir(): string {
  return path.join(os.homedir(), '.agent-manager', 'artifacts');
}

export interface ArtifactInfo {
  name: string;
  path: string;
  modifiedAt: Date;
}

export async function listArtifacts(): Promise<ArtifactInfo[]> {
  const artifactsDir = getArtifactsDir();

  try {
    const files = await fs.promises.readdir(artifactsDir);
    const artifacts: ArtifactInfo[] = [];

    for (const file of files) {
      if (file.startsWith('.')) continue;

      const fullPath = path.join(artifactsDir, file);
      const stats = await fs.promises.stat(fullPath);

      if (stats.isFile()) {
        artifacts.push({
          name: file,
          path: fullPath,
          modifiedAt: stats.mtime
        });
      }
    }

    return artifacts.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch (err) {
    return [];
  }
}

export function formatArtifactReference(artifactName: string): string {
  return `<artifact:${artifactName}>`;
}

export async function deleteArtifact(artifactPath: string): Promise<void> {
  try {
    await fs.promises.unlink(artifactPath);
  } catch (err) {
    throw new Error(`Failed to delete artifact: ${err}`);
  }
}
