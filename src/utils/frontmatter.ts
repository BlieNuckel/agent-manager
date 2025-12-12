import matter from 'gray-matter';
import type { TemplateFrontmatter } from '../types/templates';

export interface ParsedFrontmatter {
  data: TemplateFrontmatter | Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(rawContent: string): ParsedFrontmatter {
  try {
    const result = matter(rawContent);
    return {
      data: result.data as TemplateFrontmatter | Record<string, unknown>,
      content: result.content
    };
  } catch {
    return {
      data: {},
      content: rawContent
    };
  }
}

export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  return matter.stringify(body, data);
}

export function updateFrontmatter(rawContent: string, updates: Record<string, unknown>): string {
  const parsed = parseFrontmatter(rawContent);
  const updatedData = { ...parsed.data, ...updates };
  return stringifyFrontmatter(updatedData, parsed.content);
}

export function hasFrontmatter(rawContent: string): boolean {
  return rawContent.trimStart().startsWith('---');
}
