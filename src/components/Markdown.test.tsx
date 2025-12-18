import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';

chalk.level = 3;

marked.use(markedTerminal({
  code: chalk.yellow,
  codespan: chalk.yellow,
}));

describe('Markdown rendering', () => {
  describe('List items with inline markdown', () => {
    it('should render bold text in unordered lists', () => {
      const markdown = '- This is **bold** text';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[1m');
      expect(rendered).toContain('\x1b[22m');
      expect(rendered).not.toContain('**');
    });

    it('should render italic text in unordered lists', () => {
      const markdown = '- This is *italic* text';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[3m');
      expect(rendered).toContain('\x1b[23m');
    });

    it('should render inline code in unordered lists', () => {
      const markdown = '- This is `code` text';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[33m');
      expect(rendered).toContain('\x1b[39m');
      expect(rendered).not.toContain('`');
    });

    it('should render links in unordered lists', () => {
      const markdown = '- This is a [link](https://example.com)';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[34m');
      expect(rendered).toContain('https://example.com');
    });

    it('should render bold text in ordered lists', () => {
      const markdown = '1. First item with **bold**';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[1m');
      expect(rendered).toContain('\x1b[22m');
      expect(rendered).not.toContain('**');
    });

    it('should render italic text in ordered lists', () => {
      const markdown = '1. First item with *italic*';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[3m');
      expect(rendered).toContain('\x1b[23m');
    });

    it('should render multiple inline elements in the same list item', () => {
      const markdown = '- This has **bold** and *italic* and `code`';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[1m');
      expect(rendered).toContain('\x1b[3m');
      expect(rendered).toContain('\x1b[33m');
      expect(rendered).not.toContain('**');
      expect(rendered).not.toContain('`');
    });

    it('should render markdown in multi-item lists', () => {
      const markdown = `- First item with **bold**
- Second item with *italic*
- Third item with \`code\``;
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[1m');
      expect(rendered).toContain('\x1b[3m');
      expect(rendered).toContain('\x1b[33m');
    });

    it('should render markdown in nested lists', () => {
      const markdown = `- Parent with **bold**
  - Child with *italic*
  - Another child with \`code\``;
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[1m');
      expect(rendered).toContain('\x1b[3m');
      expect(rendered).toContain('\x1b[33m');
    });
  });

  describe('Comparison with paragraphs', () => {
    it('should render inline markdown the same way in lists and paragraphs', () => {
      const listMarkdown = '- Text with **bold**';
      const paragraphMarkdown = 'Text with **bold**';

      const listRendered = marked.parse(listMarkdown) as string;
      const paragraphRendered = marked.parse(paragraphMarkdown) as string;

      expect(listRendered).toContain('\x1b[1m');
      expect(paragraphRendered).toContain('\x1b[1m');

      expect(listRendered).not.toContain('**');
      expect(paragraphRendered).not.toContain('**');
    });
  });

  describe('Edge cases', () => {
    it('should handle list items with only inline markdown', () => {
      const markdown = '- **Bold only**';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[1m');
      expect(rendered).not.toContain('**');
    });

    it('should handle empty list items', () => {
      const markdown = '- \n- Text';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toBeTruthy();
    });

    it('should handle list items with special characters', () => {
      const markdown = '- Code: `const x = 5 * 3;`';
      const rendered = marked.parse(markdown) as string;

      expect(rendered).toContain('\x1b[33m');
      expect(rendered).not.toContain('`');
    });
  });
});
