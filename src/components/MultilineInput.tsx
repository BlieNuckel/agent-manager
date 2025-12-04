import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const MultilineInput = ({
  value,
  onChange,
  onSubmit,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
}) => {
  const [cursor, setCursor] = useState(value.length);

  useEffect(() => {
    setCursor(value.length);
  }, [value]);

  useInput((input, key) => {
    if (key.ctrl && input === 'g') {
      openInVim();
      return;
    }

    if (key.return && key.shift) {
      const before = value.slice(0, cursor);
      const after = value.slice(cursor);
      const newValue = before + '\n' + after;
      onChange(newValue);
      setCursor(cursor + 1);
      return;
    }

    if (key.return && !key.shift) {
      onSubmit(value);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursor > 0) {
        const before = value.slice(0, cursor - 1);
        const after = value.slice(cursor);
        onChange(before + after);
        setCursor(cursor - 1);
      }
      return;
    }

    if (key.leftArrow) {
      setCursor(Math.max(0, cursor - 1));
      return;
    }

    if (key.rightArrow) {
      setCursor(Math.min(value.length, cursor + 1));
      return;
    }

    if (key.upArrow) {
      const lines = value.slice(0, cursor).split('\n');
      if (lines.length > 1) {
        const currentLinePos = lines[lines.length - 1].length;
        const prevLineLength = lines[lines.length - 2].length;
        const newPos = cursor - currentLinePos - prevLineLength - 1;
        const targetPos = Math.min(newPos + Math.min(currentLinePos, prevLineLength), newPos + prevLineLength);
        setCursor(Math.max(0, targetPos));
      }
      return;
    }

    if (key.downArrow) {
      const allLines = value.split('\n');
      const beforeCursor = value.slice(0, cursor);
      const lines = beforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;

      if (currentLineIndex < allLines.length - 1) {
        const currentLinePos = lines[lines.length - 1].length;
        const nextLineLength = allLines[currentLineIndex + 1].length;
        const newPos = cursor + (allLines[currentLineIndex].length - currentLinePos) + 1;
        const targetPos = Math.min(newPos + Math.min(currentLinePos, nextLineLength), newPos + nextLineLength);
        setCursor(Math.min(value.length, targetPos));
      }
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      const before = value.slice(0, cursor);
      const after = value.slice(cursor);
      const newValue = before + input + after;
      onChange(newValue);
      setCursor(cursor + input.length);
    }
  });

  const openInVim = () => {
    const tmpFile = join(tmpdir(), `agent-prompt-${Date.now()}.txt`);

    try {
      writeFileSync(tmpFile, value, 'utf8');

      const result = spawnSync('vim', [tmpFile], {
        stdio: 'inherit'
      });

      if (result.status === 0) {
        const newContent = readFileSync(tmpFile, 'utf8');
        onChange(newContent);
        setCursor(newContent.length);
      }

      unlinkSync(tmpFile);
    } catch (err) {
      console.error('Error opening vim:', err);
    }
  };

  const displayValue = value || (placeholder ? placeholder : '');
  const lines = displayValue.split('\n');

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} dimColor={!value && !!placeholder}>
          {line || ' '}
          {i === lines.length - 1 && cursor === value.length && <Text color="cyan">█</Text>}
        </Text>
      ))}
    </Box>
  );
};
