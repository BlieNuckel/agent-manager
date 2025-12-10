import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTime, formatTimeAgo, genId, formatToolInput } from './helpers';

describe('formatTime', () => {
  it('formats date to HH:MM format', () => {
    const date = new Date('2025-01-15T14:30:00');
    const result = formatTime(date);
    expect(result).toMatch(/^\d{2}:\d{2}( [AP]M)?$/);
  });

  it('handles midnight correctly', () => {
    const date = new Date('2025-01-15T00:00:00');
    const result = formatTime(date);
    expect(result).toBeTruthy();
  });

  it('handles noon correctly', () => {
    const date = new Date('2025-01-15T12:00:00');
    const result = formatTime(date);
    expect(result).toBeTruthy();
  });
});

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than a minute ago', () => {
    const now = new Date();
    expect(formatTimeAgo(now)).toBe('just now');
  });

  it('returns "just now" for 59 seconds ago', () => {
    const fiftyNineSecondsAgo = new Date(Date.now() - 59 * 1000);
    expect(formatTimeAgo(fiftyNineSecondsAgo)).toBe('just now');
  });

  it('returns minutes for timestamps 1-59 minutes ago', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    expect(formatTimeAgo(oneMinuteAgo)).toBe('1m ago');

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    expect(formatTimeAgo(thirtyMinAgo)).toBe('30m ago');

    const fiftyNineMinAgo = new Date(Date.now() - 59 * 60 * 1000);
    expect(formatTimeAgo(fiftyNineMinAgo)).toBe('59m ago');
  });

  it('returns hours for timestamps 1-23 hours ago', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(formatTimeAgo(oneHourAgo)).toBe('1h ago');

    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    expect(formatTimeAgo(fiveHoursAgo)).toBe('5h ago');

    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
    expect(formatTimeAgo(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('returns days for timestamps 1+ days ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(oneDayAgo)).toBe('1d ago');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(sevenDaysAgo)).toBe('7d ago');
  });
});

describe('genId', () => {
  it('generates a string ID', () => {
    const id = genId();
    expect(typeof id).toBe('string');
  });

  it('generates IDs of expected length (8 characters)', () => {
    const id = genId();
    expect(id.length).toBe(8);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(genId());
    }
    expect(ids.size).toBe(100);
  });

  it('generates alphanumeric IDs', () => {
    const id = genId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

describe('formatToolInput', () => {
  it('extracts file_path from input object', () => {
    const input = { file_path: '/path/to/file.ts' };
    expect(formatToolInput(input)).toBe('/path/to/file.ts');
  });

  it('extracts and truncates command from input object', () => {
    const input = { command: 'npm install && npm run build && npm test' };
    const result = formatToolInput(input);
    expect(result).toBe('npm install && npm run build && npm test');
  });

  it('truncates long commands to 60 characters', () => {
    const longCommand = 'a'.repeat(100);
    const input = { command: longCommand };
    const result = formatToolInput(input);
    expect(result.length).toBe(60);
  });

  it('handles content with file_path', () => {
    const input = { content: 'some content', file_path: '/test/file.ts' };
    expect(formatToolInput(input)).toBe('/test/file.ts');
  });

  it('handles content without file_path', () => {
    const input = { content: 'some content' };
    expect(formatToolInput(input)).toBe('file: unknown');
  });

  it('falls back to JSON stringification for unknown object structures', () => {
    const input = { foo: 'bar', baz: 123 };
    const result = formatToolInput(input);
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('truncates JSON output to 80 characters', () => {
    const input = { very_long_key: 'a'.repeat(100), another_key: 'b'.repeat(100) };
    const result = formatToolInput(input);
    expect(result.length).toBe(80);
  });

  it('handles string input directly', () => {
    const input = 'simple string';
    expect(formatToolInput(input)).toBe('simple string');
  });

  it('truncates long string input to 60 characters', () => {
    const longString = 'x'.repeat(100);
    const result = formatToolInput(longString);
    expect(result.length).toBe(60);
  });

  it('handles null input', () => {
    const result = formatToolInput(null);
    expect(result).toBe('null');
  });

  it('handles undefined input', () => {
    const result = formatToolInput(undefined);
    expect(result).toBe('undefined');
  });

  it('handles number input', () => {
    expect(formatToolInput(42)).toBe('42');
  });

  it('handles boolean input', () => {
    expect(formatToolInput(true)).toBe('true');
    expect(formatToolInput(false)).toBe('false');
  });
});
