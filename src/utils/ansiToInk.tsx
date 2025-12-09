import React from 'react';
import { Text } from 'ink';

interface TextSegment {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dimColor?: boolean;
}

const ANSI_REGEX = /\u001b\[([0-9;]+)m/g;

const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'yellow',
  34: 'blue',
  35: 'magenta',
  36: 'cyan',
  37: 'white',
  90: 'gray',
  91: 'red',
  92: 'green',
  93: 'yellow',
  94: 'blue',
  95: 'magenta',
  96: 'cyan',
  97: 'white',
};

export function parseAnsiToSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentStyle: Partial<TextSegment> = {};
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ANSI_REGEX.lastIndex = 0;

  while ((match = ANSI_REGEX.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore) {
      segments.push({ text: textBefore, ...currentStyle });
    }

    const codes = match[1].split(';').map(Number);
    for (const code of codes) {
      if (code === 0) {
        currentStyle = {};
      } else if (code === 1) {
        currentStyle.bold = true;
      } else if (code === 2) {
        currentStyle.dimColor = true;
      } else if (code === 3) {
        currentStyle.italic = true;
      } else if (code === 4) {
        currentStyle.underline = true;
      } else if (code === 9) {
        currentStyle.strikethrough = true;
      } else if (code === 22) {
        currentStyle.bold = false;
        currentStyle.dimColor = false;
      } else if (code === 23) {
        currentStyle.italic = false;
      } else if (code === 24) {
        currentStyle.underline = false;
      } else if (code === 29) {
        currentStyle.strikethrough = false;
      } else if (code >= 30 && code <= 37) {
        currentStyle.color = ANSI_COLOR_MAP[code];
      } else if (code >= 90 && code <= 97) {
        currentStyle.color = ANSI_COLOR_MAP[code];
      } else if (code === 39) {
        currentStyle.color = undefined;
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    segments.push({ text: remainingText, ...currentStyle });
  }

  return segments.filter(seg => seg.text.length > 0);
}

export function AnsiText({ children, wrap = 'wrap' }: { children: string; wrap?: 'wrap' | 'truncate' | 'truncate-end' | 'truncate-middle' | 'truncate-start' }): JSX.Element {
  const segments = parseAnsiToSegments(children);

  if (segments.length === 0) {
    return <Text wrap={wrap}>{children}</Text>;
  }

  if (segments.length === 1) {
    const seg = segments[0];
    return (
      <Text
        wrap={wrap}
        color={seg.color}
        bold={seg.bold}
        italic={seg.italic}
        underline={seg.underline}
        strikethrough={seg.strikethrough}
        dimColor={seg.dimColor}
      >
        {seg.text}
      </Text>
    );
  }

  return (
    <Text wrap={wrap}>
      {segments.map((seg, i) => (
        <Text
          key={i}
          color={seg.color}
          bold={seg.bold}
          italic={seg.italic}
          underline={seg.underline}
          strikethrough={seg.strikethrough}
          dimColor={seg.dimColor}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}
