import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import type { CustomAgentType, AgentToolConfig, AgentArtifactConfig } from '../types/agentTypes';
import { parseFrontmatter } from './frontmatter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getSystemAgentTypesDir(): string {
  return path.resolve(__dirname, '../../assets/agents');
}

export function getUserAgentTypesDir(): string {
  return path.join(os.homedir(), '.agent-manager', 'agents');
}

export async function ensureUserAgentTypesDir(): Promise<void> {
  const dir = getUserAgentTypesDir();
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

async function loadAgentTypesFromDir(dir: string, source: 'system' | 'user'): Promise<CustomAgentType[]> {
  const agentTypes: CustomAgentType[] = [];

  try {
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const fullPath = path.join(dir, file);
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      const parsed = parseFrontmatter(content);

      const data = parsed.data as Record<string, unknown>;
      if (!data.id || !data.name || !data.description) continue;

      agentTypes.push({
        id: data.id as string,
        name: data.name as string,
        description: data.description as string,
        version: data.version as number | undefined,
        source,
        path: fullPath,
        tools: data.tools as AgentToolConfig | undefined,
        artifacts: data.artifacts as AgentArtifactConfig | undefined,
        model: data.model as 'opus' | 'sonnet' | 'haiku' | undefined,
        worktree: data.worktree as boolean | undefined,
        systemPrompt: parsed.content.trim()
      });
    }
  } catch {
    // Directory may not exist
  }

  return agentTypes;
}

export async function listAgentTypes(): Promise<CustomAgentType[]> {
  const systemDir = getSystemAgentTypesDir();
  const userDir = getUserAgentTypesDir();

  const [systemAgentTypes, userAgentTypes] = await Promise.all([
    loadAgentTypesFromDir(systemDir, 'system'),
    loadAgentTypesFromDir(userDir, 'user')
  ]);

  const agentTypeMap = new Map<string, CustomAgentType>();

  for (const agentType of systemAgentTypes) {
    agentTypeMap.set(agentType.id, agentType);
  }

  for (const agentType of userAgentTypes) {
    agentTypeMap.set(agentType.id, agentType);
  }

  return Array.from(agentTypeMap.values());
}

export async function getAgentType(id: string): Promise<CustomAgentType | undefined> {
  const agentTypes = await listAgentTypes();
  return agentTypes.find(t => t.id === id);
}

export interface SystemPromptContext {
  produces?: string;
  inputArtifact?: string;
  workingDirectory?: string;
  agentName?: string;
  [key: string]: unknown;
}

export function buildAgentSystemPrompt(agentType: CustomAgentType, context: SystemPromptContext = {}): string {
  const compiled = Handlebars.compile(agentType.systemPrompt);

  const fullContext = {
    ...context,
    produces: context.produces || agentType.artifacts?.produces
  };

  return compiled(fullContext);
}

export function matchesPattern(value: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return value.startsWith(prefix);
  }
  return value === pattern;
}

export function isToolAllowed(
  toolName: string,
  toolConfig: AgentToolConfig | undefined,
  bashCommand?: string
): boolean {
  if (!toolConfig) return true;

  if (toolConfig.deny && toolConfig.deny.some(p => matchesPattern(toolName, p))) {
    return false;
  }

  if (toolConfig.allow && toolConfig.allow.length > 0) {
    if (!toolConfig.allow.some(p => matchesPattern(toolName, p))) {
      return false;
    }
  }

  if (toolName === 'Bash' && bashCommand) {
    if (toolConfig.bashDeny && toolConfig.bashDeny.some(p => matchesPattern(bashCommand, p))) {
      return false;
    }

    if (toolConfig.bashAllow && toolConfig.bashAllow.length > 0) {
      if (!toolConfig.bashAllow.some(p => matchesPattern(bashCommand, p))) {
        return false;
      }
    }
  }

  return true;
}
