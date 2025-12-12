import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSystemTemplatesDir, getUserTemplatesDir, instantiateTemplate, validateArtifactAgainstTemplate } from './templates';
import type { Template, TemplateSchema } from '../types/templates';
import path from 'path';
import os from 'os';

describe('templates utilities', () => {
  describe('getSystemTemplatesDir', () => {
    it('should return a path ending with assets/templates', () => {
      const dir = getSystemTemplatesDir();
      expect(dir).toContain('assets');
      expect(dir).toContain('templates');
    });
  });

  describe('getUserTemplatesDir', () => {
    it('should return a path in home directory', () => {
      const dir = getUserTemplatesDir();
      expect(dir).toBe(path.join(os.homedir(), '.agent-manager', 'templates'));
    });
  });

  describe('instantiateTemplate', () => {
    it('should substitute template values', () => {
      const template: Template = {
        id: 'test',
        name: 'Test Template',
        description: 'A test template',
        source: 'system',
        path: '/path/to/test.md',
        content: '# {{title}}\n\nAgent: {{agent}}'
      };

      const result = instantiateTemplate(template, {
        title: 'My Test',
        agent: 'test-agent'
      });

      expect(result).toContain('# My Test');
      expect(result).toContain('Agent: test-agent');
      expect(result).toContain('template: test');
    });

    it('should add default date if not provided', () => {
      const template: Template = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        source: 'system',
        path: '/path/to/test.md',
        content: 'Created: {{date}}'
      };

      const result = instantiateTemplate(template, { title: 'Test' });
      const today = new Date().toISOString().split('T')[0];

      expect(result).toContain(`created: ${today}`);
    });
  });

  describe('validateArtifactAgainstTemplate', () => {
    it('should return true when all required fields present', () => {
      const frontmatter = {
        template: 'plan',
        title: 'Test',
        phases: [{ name: 'Phase 1', status: 'pending' }]
      };

      const schema: TemplateSchema = {
        requiredFields: ['title', 'phases'],
        optionalFields: ['agent', 'notes']
      };

      expect(validateArtifactAgainstTemplate(frontmatter, schema)).toBe(true);
    });

    it('should return false when required field is missing', () => {
      const frontmatter = {
        template: 'plan',
        title: 'Test'
      };

      const schema: TemplateSchema = {
        requiredFields: ['title', 'phases'],
        optionalFields: ['agent']
      };

      expect(validateArtifactAgainstTemplate(frontmatter, schema)).toBe(false);
    });

    it('should return false when required field is null', () => {
      const frontmatter = {
        template: 'plan',
        title: 'Test',
        phases: null
      };

      const schema: TemplateSchema = {
        requiredFields: ['title', 'phases'],
        optionalFields: []
      };

      expect(validateArtifactAgainstTemplate(frontmatter, schema)).toBe(false);
    });
  });
});
