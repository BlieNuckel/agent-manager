import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import Clipboard from '@crosscopy/clipboard';
import { writeFile, mkdir } from 'fs/promises';
import { TEMP_IMAGES_DIR } from '../utils/imageStorage.js';

function detectImageType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

export const MultilineInput = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  onImagePasted
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  onImagePasted?: (id: string, path: string, base64: string, mediaType: string) => void;
}) => {
  const [cursor, setCursor] = useState(value.length);

  useEffect(() => {
    setCursor(value.length);
  }, [value]);

  const handleImagePaste = async () => {
    try {
      if (await Clipboard.hasImage()) {
        const imageId = `image-${Date.now()}`;
        const base64Data = await Clipboard.getImageBase64();

        const mediaType = detectImageType(base64Data);
        const extension = mediaType.split('/')[1];

        await mkdir(TEMP_IMAGES_DIR, { recursive: true });
        const tempPath = join(TEMP_IMAGES_DIR, `${imageId}.${extension}`);
        const buffer = Buffer.from(base64Data, 'base64');
        await writeFile(tempPath, buffer);

        const indicator = `<image:${imageId}.${extension}>`;
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        const newValue = before + indicator + after;

        onChange(newValue);
        setCursor(cursor + indicator.length);

        onImagePasted?.(imageId, tempPath, base64Data, mediaType);

      } else {
        const text = await Clipboard.getText();
        if (text) {
          const before = value.slice(0, cursor);
          const after = value.slice(cursor);
          onChange(before + text + after);
          setCursor(cursor + text.length);
        }
      }
    } catch (error) {
      console.error('Paste error:', error);
    }
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'v') {
      handleImagePaste();
      return;
    }

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
  const showCursor = value.length === 0 || cursor === value.length;

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} dimColor={!value && !!placeholder}>
          {i === 0 && value.length === 0 && showCursor && <Text color="cyan">█</Text>}
          {line || ' '}
          {i === lines.length - 1 && value.length > 0 && cursor === value.length && <Text color="cyan">█</Text>}
        </Text>
      ))}
    </Box>
  );
};
