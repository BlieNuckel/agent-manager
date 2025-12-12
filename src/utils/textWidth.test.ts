import { describe, it, expect } from 'vitest';
import { getVisualWidth, wrapTextToWidth, splitIntoWrappedLines, truncateToWidth } from './textWidth';

describe('getVisualWidth', () => {
  it('counts ASCII characters correctly', () => {
    expect(getVisualWidth('hello')).toBe(5);
    expect(getVisualWidth('Agent Manager')).toBe(13);
  });

  it('counts emojis as 2 width', () => {
    expect(getVisualWidth('🤖')).toBe(2);
    expect(getVisualWidth('📎')).toBe(2);
    expect(getVisualWidth('⏱')).toBe(2);
  });

  it('handles mixed ASCII and emoji', () => {
    expect(getVisualWidth('Hello 🤖')).toBe(8);
    expect(getVisualWidth('🤖 Agent')).toBe(8);
  });

  it('handles ANSI escape codes', () => {
    const coloredText = '\u001b[32mGreen\u001b[0m';
    expect(getVisualWidth(coloredText)).toBe(5);
  });

  it('handles arrow characters', () => {
    expect(getVisualWidth('→')).toBe(1);
    expect(getVisualWidth('←')).toBe(1);
    expect(getVisualWidth('  → ')).toBe(4);
  });

  it('handles empty string', () => {
    expect(getVisualWidth('')).toBe(0);
  });

  it('handles multiple emojis', () => {
    expect(getVisualWidth('🤖📎⏱')).toBe(6);
  });
});

describe('wrapTextToWidth', () => {
  it('does not wrap text shorter than maxWidth', () => {
    expect(wrapTextToWidth('hello', 10)).toEqual(['hello']);
    expect(wrapTextToWidth('test', 100)).toEqual(['test']);
  });

  it('returns original text for zero or negative width', () => {
    expect(wrapTextToWidth('hello world', 0)).toEqual(['hello world']);
    expect(wrapTextToWidth('hello world', -5)).toEqual(['hello world']);
  });

  it('wraps long ASCII text', () => {
    const result = wrapTextToWidth('hello world test', 10);
    expect(result.length).toBeGreaterThan(1);
    result.forEach(line => {
      expect(getVisualWidth(line)).toBeLessThanOrEqual(10);
    });
  });

  it('wraps text with emojis correctly', () => {
    const text = '🤖 Agent Manager System';
    const result = wrapTextToWidth(text, 10);
    expect(result.length).toBeGreaterThan(1);
    result.forEach(line => {
      expect(getVisualWidth(line)).toBeLessThanOrEqual(10);
    });
  });

  it('handles text that is exactly maxWidth', () => {
    const text = 'exact';
    const result = wrapTextToWidth(text, 5);
    expect(result).toEqual(['exact']);
  });

  it('handles single character exceeding width', () => {
    const result = wrapTextToWidth('🤖', 1);
    expect(result).toEqual(['🤖']);
  });

  it('wraps multiple emojis', () => {
    const text = '🤖📎⏱🎯';
    const result = wrapTextToWidth(text, 5);
    expect(result.length).toBeGreaterThan(1);
  });

  it('handles empty string', () => {
    expect(wrapTextToWidth('', 10)).toEqual(['']);
  });

  it('handles ANSI colored text', () => {
    const text = '\u001b[32m' + 'a'.repeat(20) + '\u001b[0m';
    const result = wrapTextToWidth(text, 10);
    expect(result.length).toBeGreaterThanOrEqual(2);
    result.forEach(line => {
      expect(getVisualWidth(line)).toBeLessThanOrEqual(10);
    });
  });
});

describe('splitIntoWrappedLines', () => {
  it('does not add spaces when preserveLeadingSpaces is false', () => {
    const result = splitIntoWrappedLines('hello world test', 8, false);
    result.forEach(line => {
      expect(line).not.toMatch(/^  /);
    });
  });

  it('preserves leading spaces on continuation lines when enabled', () => {
    const result = splitIntoWrappedLines('hello world test', 8, true);
    expect(result[0]).not.toMatch(/^  /);
    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toMatch(/^  /);
      }
    }
  });

  it('handles short text that does not wrap', () => {
    const result = splitIntoWrappedLines('short', 20, true);
    expect(result).toEqual(['short']);
  });

  it('returns original text for zero or negative width', () => {
    expect(splitIntoWrappedLines('hello world', 0, false)).toEqual(['hello world']);
  });

  it('handles empty string', () => {
    expect(splitIntoWrappedLines('', 10, false)).toEqual(['']);
  });
});

describe('truncateToWidth', () => {
  it('does not truncate short text', () => {
    expect(truncateToWidth('hello', 10)).toBe('hello');
    expect(truncateToWidth('test', 100)).toBe('test');
  });

  it('truncates long text with ellipsis', () => {
    const result = truncateToWidth('hello world test', 10);
    expect(result).toContain('...');
    expect(getVisualWidth(result)).toBeLessThanOrEqual(10);
  });

  it('handles emoji truncation', () => {
    const text = '🤖'.repeat(10);
    const result = truncateToWidth(text, 10);
    expect(getVisualWidth(result)).toBeLessThanOrEqual(10);
  });

  it('handles custom ellipsis', () => {
    const result = truncateToWidth('hello world test', 10, '…');
    expect(result).toContain('…');
    expect(result).not.toContain('...');
  });

  it('handles text exactly at maxWidth', () => {
    expect(truncateToWidth('exact', 5)).toBe('exact');
  });

  it('handles maxWidth smaller than ellipsis', () => {
    const result = truncateToWidth('hello world', 2);
    expect(getVisualWidth(result)).toBeLessThanOrEqual(2);
  });

  it('handles empty string', () => {
    expect(truncateToWidth('', 10)).toBe('');
  });

  it('handles ANSI colored text', () => {
    const text = '\u001b[32m' + 'a'.repeat(20) + '\u001b[0m';
    const result = truncateToWidth(text, 10);
    expect(getVisualWidth(result)).toBeLessThanOrEqual(10);
  });

  it('handles mixed emoji and ASCII', () => {
    const text = 'Hello 🤖 World 📎 Test';
    const result = truncateToWidth(text, 12);
    expect(getVisualWidth(result)).toBeLessThanOrEqual(12);
    expect(result).toContain('...');
  });
});
