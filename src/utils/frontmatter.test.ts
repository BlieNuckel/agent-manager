import { describe, it, expect } from 'vitest';
import { parseFrontmatter, stringifyFrontmatter, updateFrontmatter, hasFrontmatter } from './frontmatter';

describe('frontmatter utilities', () => {
  describe('parseFrontmatter', () => {
    it('should parse YAML frontmatter from markdown', () => {
      const content = `---
template: plan
version: 1
title: Test Plan
---

# Test Content`;

      const result = parseFrontmatter(content);

      expect(result.data).toEqual({
        template: 'plan',
        version: 1,
        title: 'Test Plan'
      });
      expect(result.content.trim()).toBe('# Test Content');
    });

    it('should return empty data for content without frontmatter', () => {
      const content = `# Just a header

Some content`;

      const result = parseFrontmatter(content);

      expect(result.data).toEqual({});
      expect(result.content).toBe(content);
    });

    it('should handle empty content', () => {
      const result = parseFrontmatter('');

      expect(result.data).toEqual({});
      expect(result.content).toBe('');
    });
  });

  describe('stringifyFrontmatter', () => {
    it('should create markdown with frontmatter', () => {
      const data = { template: 'plan', version: 1 };
      const body = '# Content';

      const result = stringifyFrontmatter(data, body);

      expect(result).toContain('---');
      expect(result).toContain('template: plan');
      expect(result).toContain('version: 1');
      expect(result).toContain('# Content');
    });
  });

  describe('updateFrontmatter', () => {
    it('should update specific frontmatter fields', () => {
      const content = `---
template: plan
version: 1
---

# Content`;

      const result = updateFrontmatter(content, { version: 2, title: 'Updated' });

      expect(result).toContain('version: 2');
      expect(result).toContain('title: Updated');
      expect(result).toContain('template: plan');
      expect(result).toContain('# Content');
    });
  });

  describe('hasFrontmatter', () => {
    it('should return true for content with frontmatter', () => {
      const content = `---
template: plan
---

# Content`;

      expect(hasFrontmatter(content)).toBe(true);
    });

    it('should return true for content with leading whitespace before frontmatter', () => {
      const content = `  ---
template: plan
---

# Content`;

      expect(hasFrontmatter(content)).toBe(true);
    });

    it('should return false for content without frontmatter', () => {
      const content = `# Just a header`;

      expect(hasFrontmatter(content)).toBe(false);
    });
  });
});
