import { describe, it, expect } from 'vitest';
import { parseAnsiToSegments } from './ansiToInk';

describe('parseAnsiToSegments', () => {
  it('should parse basic 16-color ANSI codes', () => {
    const text = '\u001b[31mRed text\u001b[39m';
    const segments = parseAnsiToSegments(text);
    expect(segments).toEqual([
      { text: 'Red text', color: 'red' }
    ]);
  });

  it('should parse 24-bit TrueColor ANSI codes', () => {
    const text = '\u001b[38;2;255;102;0mOrange text\u001b[39m';
    const segments = parseAnsiToSegments(text);
    expect(segments).toEqual([
      { text: 'Orange text', color: '#ff6600' }
    ]);
  });

  it('should handle multiple 24-bit colors', () => {
    const text = '\u001b[38;2;255;0;0mRed\u001b[39m \u001b[38;2;0;255;0mGreen\u001b[39m \u001b[38;2;0;0;255mBlue\u001b[39m';
    const segments = parseAnsiToSegments(text);
    expect(segments).toEqual([
      { text: 'Red', color: '#ff0000' },
      { text: ' ' },
      { text: 'Green', color: '#00ff00' },
      { text: ' ' },
      { text: 'Blue', color: '#0000ff' }
    ]);
  });

  it('should preserve styles with 24-bit colors', () => {
    const text = '\u001b[38;2;255;102;0m\u001b[1m\u001b[4mBold Underline Orange\u001b[24m\u001b[22m\u001b[39m';
    const segments = parseAnsiToSegments(text);
    expect(segments).toEqual([
      { text: 'Bold Underline Orange', color: '#ff6600', bold: true, underline: true }
    ]);
  });

  it('should handle edge cases for RGB values', () => {
    // Missing RGB values should default to 0
    const text = '\u001b[38;2;255mPartial\u001b[39m';
    const segments = parseAnsiToSegments(text);
    expect(segments).toEqual([
      { text: 'Partial', color: '#ff0000' }
    ]);
  });
});