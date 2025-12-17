import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseFrontmatter, hasFrontmatter } from './frontmatter';
import { getTemplate, validateArtifactAgainstTemplate, instantiateTemplate, type TemplateValues } from './templates';
import type { TemplateFrontmatter, TemplatedArtifact, Template } from '../types/templates';

export function getArtifactsDir(): string {
  return path.join(os.homedir(), '.agent-manager', 'artifacts');
}

export interface ArtifactInfo {
  name: string;
  path: string;
  modifiedAt: Date;
  frontmatter?: TemplateFrontmatter;
  templateId?: string;
  templateValid?: boolean;
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
        const artifact: ArtifactInfo = {
          name: file,
          path: fullPath,
          modifiedAt: stats.mtime
        };

        if (file.endsWith('.md')) {
          try {
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            if (hasFrontmatter(content)) {
              const parsed = parseFrontmatter(content);
              const data = parsed.data as TemplateFrontmatter;
              if (data.template) {
                artifact.frontmatter = data;
                artifact.templateId = data.template;

                const template = await getTemplate(data.template);
                if (template?.schema) {
                  artifact.templateValid = validateArtifactAgainstTemplate(data, template.schema);
                }
              }
            }
          } catch {
            // Could not parse frontmatter
          }
        }

        artifacts.push(artifact);
      }
    }

    return artifacts.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch {
    return [];
  }
}

export async function getArtifactFrontmatter(artifactPath: string): Promise<TemplateFrontmatter | undefined> {
  try {
    const content = await fs.promises.readFile(artifactPath, 'utf-8');
    if (!hasFrontmatter(content)) return undefined;

    const parsed = parseFrontmatter(content);
    const data = parsed.data as TemplateFrontmatter;
    return data.template ? data : undefined;
  } catch {
    return undefined;
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

export async function createArtifactFromTemplate(
  template: Template,
  values: TemplateValues,
  filename?: string
): Promise<string> {
  const artifactsDir = getArtifactsDir();

  try {
    await fs.promises.mkdir(artifactsDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  const date = new Date().toISOString().split('T')[0];
  const title = values.title || 'untitled';
  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const defaultFilename = `${date}-${safeName}.md`;
  const finalFilename = filename || defaultFilename;

  const content = instantiateTemplate(template, values);
  const fullPath = path.join(artifactsDir, finalFilename);

  await fs.promises.writeFile(fullPath, content, 'utf-8');

  return fullPath;
}

export async function ensureArtifactsDir(): Promise<void> {
  const artifactsDir = getArtifactsDir();
  try {
    await fs.promises.mkdir(artifactsDir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

export async function findArtifactByWorkflowStage(
  executionId: string,
  stageId: string
): Promise<string | undefined> {
  const artifacts = await listArtifacts();

  for (const artifact of artifacts) {
    if (!artifact.path.endsWith('.md')) continue;

    try {
      const content = await fs.promises.readFile(artifact.path, 'utf-8');
      if (!hasFrontmatter(content)) continue;

      const parsed = parseFrontmatter(content);
      const data = parsed.data as Record<string, unknown>;

      if (data.workflowExecutionId === executionId && data.workflowStageId === stageId) {
        return artifact.path;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

export async function findRecentArtifacts(limit: number = 5): Promise<ArtifactInfo[]> {
  const artifacts = await listArtifacts();
  return artifacts.slice(0, limit);
}

export interface ArtifactSearchResult {
  found: boolean;
  artifactPath?: string;
  recentAlternatives?: ArtifactInfo[];
  error?: string;
}

export async function findArtifactWithFallback(
  executionId: string,
  stageId: string
): Promise<ArtifactSearchResult> {
  const artifactPath = await findArtifactByWorkflowStage(executionId, stageId);

  if (artifactPath) {
    return { found: true, artifactPath };
  }

  const recentArtifacts = await findRecentArtifacts(5);

  return {
    found: false,
    recentAlternatives: recentArtifacts,
    error: `No artifact found with workflowExecutionId="${executionId}" and workflowStageId="${stageId}"`
  };
}
