import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdownTerminalRenderer';

describe('markdownTerminalRenderer', () => {
  describe('inline styles', () => {
    it('renders bold text', () => {
      const result = renderMarkdown('This is **bold** text');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold');
      expect(result).toContain('\x1b[22m');
      expect(result).not.toContain('**');
    });

    it('renders italic text', () => {
      const result = renderMarkdown('This is *italic* text');
      expect(result).toContain('\x1b[3m');
      expect(result).toContain('italic');
      expect(result).toContain('\x1b[23m');
      expect(result).not.toContain('*');
    });

    it('renders inline code', () => {
      const result = renderMarkdown('This is `code` text');
      expect(result).toContain('\x1b[33m');
      expect(result).toContain('code');
      expect(result).not.toContain('`');
    });

    it('renders links', () => {
      const result = renderMarkdown('This is a [link](https://example.com)');
      expect(result).toContain('\x1b[34m');
      expect(result).toContain('link');
      expect(result).toContain('](https://example.com)');
    });
  });

  describe('lists with inline markdown', () => {
    it('renders unordered lists with bold', () => {
      const result = renderMarkdown('- Item with **bold**');
      expect(result).toContain('• ');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold');
      expect(result).not.toContain('**');
    });

    it('renders ordered lists with italic', () => {
      const result = renderMarkdown('1. Item with *italic*');
      expect(result).toContain('1. ');
      expect(result).toContain('\x1b[3m');
      expect(result).toContain('italic');
      expect(result).not.toContain('*');
    });

    it('renders nested lists with inline markdown', () => {
      const markdown = `- Parent with **bold**
  - Child with *italic*
  - Another child with \`code\``;
      const result = renderMarkdown(markdown);
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('\x1b[3m');
      expect(result).toContain('\x1b[33m');
    });

    it('handles multiple inline elements in one list item', () => {
      const result = renderMarkdown('- Item with **bold**, *italic*, and `code`');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('\x1b[3m');
      expect(result).toContain('\x1b[33m');
    });
  });

  describe('headings', () => {
    it('renders level 1 heading', () => {
      const result = renderMarkdown('# Heading 1');
      expect(result).toContain('Heading 1');
      expect(result).toContain('\x1b[1m');  // bold
      expect(result).toContain('\x1b[4m');  // underline
    });

    it('renders level 2 heading', () => {
      const result = renderMarkdown('## Heading 2');
      expect(result).toContain('Heading 2');
      expect(result).toContain('\x1b[1m');  // bold
    });
  });

  describe('code blocks', () => {
    it('renders fenced code blocks', () => {
      const result = renderMarkdown('```\ncode block\n```');
      expect(result).toContain('┌─ code');
      expect(result).toContain('│ ');
      expect(result).toContain('code block');
      expect(result).toContain('└─');
    });

    it('renders code blocks with language', () => {
      const result = renderMarkdown('```javascript\nconst x = 5;\n```');
      expect(result).toContain('┌─ ');
      expect(result).toContain('javascript');
      expect(result).toContain('│ ');
      expect(result).toContain('const x = 5;');
      expect(result).toContain('└─');
    });
  });

  describe('blockquotes', () => {
    it('renders blockquotes', () => {
      const result = renderMarkdown('> This is a quote');
      expect(result).toContain('│');
      expect(result).toContain('This is a quote');
    });

    it('renders blockquotes with inline markdown', () => {
      const result = renderMarkdown('> Quote with **bold**');
      expect(result).toContain('│');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold');
    });
  });

  describe('tables', () => {
    it('renders simple tables', () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
      const result = renderMarkdown(markdown);
      expect(result).toContain('Header 1');
      expect(result).toContain('Header 2');
      expect(result).toContain('Cell 1');
      expect(result).toContain('Cell 2');
      expect(result).toContain('│');
    });
  });

  describe('edge cases', () => {
    it('handles empty markdown', () => {
      const result = renderMarkdown('');
      expect(result).toBe('');
    });

    it('handles malformed markdown gracefully', () => {
      const result = renderMarkdown('**unclosed bold');
      expect(result).toBeTruthy();
    });

    it('preserves plain text', () => {
      const result = renderMarkdown('Just plain text');
      expect(result).toContain('Just plain text');
    });
  });
});