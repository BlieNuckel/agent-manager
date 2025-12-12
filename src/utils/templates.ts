import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import type { Template, TemplateSchema } from '../types/templates';
import { parseFrontmatter } from './frontmatter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getSystemTemplatesDir(): string {
  return path.resolve(__dirname, '../../assets/templates');
}

export function getUserTemplatesDir(): string {
  return path.join(os.homedir(), '.agent-manager', 'templates');
}

export async function ensureUserTemplatesDir(): Promise<void> {
  const dir = getUserTemplatesDir();
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

async function loadTemplatesFromDir(dir: string, source: 'system' | 'user'): Promise<Template[]> {
  const templates: Template[] = [];

  try {
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const fullPath = path.join(dir, file);
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      const parsed = parseFrontmatter(content);

      const data = parsed.data as Record<string, unknown>;
      if (!data.id || !data.name || !data.description) continue;

      templates.push({
        id: data.id as string,
        name: data.name as string,
        description: data.description as string,
        source,
        path: fullPath,
        schema: data.schema as TemplateSchema | undefined,
        content: parsed.content
      });
    }
  } catch {
    // Directory may not exist
  }

  return templates;
}

export async function listTemplates(): Promise<Template[]> {
  const systemDir = getSystemTemplatesDir();
  const userDir = getUserTemplatesDir();

  const [systemTemplates, userTemplates] = await Promise.all([
    loadTemplatesFromDir(systemDir, 'system'),
    loadTemplatesFromDir(userDir, 'user')
  ]);

  const templateMap = new Map<string, Template>();

  for (const template of systemTemplates) {
    templateMap.set(template.id, template);
  }

  for (const template of userTemplates) {
    templateMap.set(template.id, template);
  }

  return Array.from(templateMap.values());
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  const templates = await listTemplates();
  return templates.find(t => t.id === id);
}

export interface TemplateValues {
  title?: string;
  date?: string;
  agent?: string;
  phases?: Array<{ name: string; status: string }>;
  notes?: string;
  [key: string]: unknown;
}

export function instantiateTemplate(template: Template, values: TemplateValues): string {
  const compiled = Handlebars.compile(template.content);

  const context = {
    ...values,
    date: values.date || new Date().toISOString().split('T')[0]
  };

  const body = compiled(context);

  const frontmatter: Record<string, unknown> = {
    template: template.id,
    version: 1,
    title: values.title || 'Untitled',
    created: context.date,
    ...(values.agent ? { agent: values.agent } : {}),
    ...(values.phases ? { phases: values.phases } : {})
  };

  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const entries = Object.entries(item);
          lines.push(`  - ${entries.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
        } else {
          lines.push(`  - ${item}`);
        }
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(body);

  return lines.join('\n');
}

export function validateArtifactAgainstTemplate(
  frontmatter: Record<string, unknown>,
  schema: TemplateSchema
): boolean {
  for (const field of schema.requiredFields) {
    if (!(field in frontmatter) || frontmatter[field] === undefined || frontmatter[field] === null) {
      return false;
    }
  }
  return true;
}
