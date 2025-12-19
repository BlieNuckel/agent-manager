import { getVisualWidth, wrapTextToWidth } from '../../utils/textWidth';
import { renderMarkdown } from '../../utils/markdownTerminalRenderer';
import type { OutputBlockData } from './types';
import type { OutputLine } from '../../types';

export interface RenderedLine {
  content: string;
  blockId: string;
  blockType: OutputBlockData['type'];
  isHeader?: boolean;
  indented?: boolean;
  // For partial line rendering when needed
  sourceLineIndex?: number;
}

interface RenderContext {
  width: number;
  collapsed: Set<string>;
  showToolCalls?: boolean;
}

export function renderBlocksToLines(
  blocks: OutputBlockData[],
  context: RenderContext
): RenderedLine[] {
  const lines: RenderedLine[] = [];
  let collapsibleIndex = 0;

  for (const block of blocks) {
    const isCollapsed = context.collapsed.has(block.id);
    const blockNumber = isCollapsibleBlock(block) ? ++collapsibleIndex : 0;

    switch (block.type) {
      case 'messages': {
        const text = block.lines.join('\n');
        // Parse markdown first, just like MessageBlock does
        let renderedText: string;
        try {
          renderedText = renderMarkdown(text);
        } catch {
          renderedText = text;
        }

        // Split and wrap lines
        const textLines = renderedText.split('\n');
        for (let i = 0; i < textLines.length; i++) {
          const line = textLines[i];
          const wrapped = wrapLineForViewport(line, context.width);
          for (const wrappedLine of wrapped) {
            lines.push({
              content: wrappedLine,
              blockId: block.id,
              blockType: block.type,
              sourceLineIndex: i
            });
          }
        }
        break;
      }

      case 'user-input': {
        lines.push({
          content: `[>] User: ${block.text}`,
          blockId: block.id,
          blockType: block.type,
          isHeader: true
        });
        break;
      }

      case 'status': {
        const content = block.variant === 'success'
          ? `[✓] ${block.line}`
          : `[✗] ${block.line}`;
        lines.push({
          content,
          blockId: block.id,
          blockType: block.type,
          isHeader: true
        });
        break;
      }

      case 'tool-group': {
        const header = isCollapsed
          ? `▶ [${blockNumber}] Tool calls (${block.count})`
          : `▼ [${blockNumber}] Tool calls (${block.count})`;

        lines.push({
          content: header,
          blockId: block.id,
          blockType: block.type,
          isHeader: true
        });

        if (!isCollapsed) {
          for (const toolLine of block.lines) {
            const wrapped = wrapLineForViewport(toolLine, context.width - 4);
            for (const wrappedLine of wrapped) {
              lines.push({
                content: '    ' + wrappedLine,
                blockId: block.id,
                blockType: block.type,
                indented: true
              });
            }
          }
        }
        break;
      }

      case 'subagent': {
        const header = isCollapsed
          ? `▶ [${blockNumber}] Subagent: ${block.subagentType} (${block.status})`
          : `▼ [${blockNumber}] Subagent: ${block.subagentType} (${block.status})`;

        lines.push({
          content: header,
          blockId: block.id,
          blockType: block.type,
          isHeader: true
        });

        if (!isCollapsed) {
          for (let i = 0; i < block.output.length; i++) {
            const outputLine = block.output[i];
            const wrapped = wrapLineForViewport(outputLine.text, context.width - 4);
            for (const wrappedLine of wrapped) {
              lines.push({
                content: '    ' + wrappedLine,
                blockId: block.id,
                blockType: block.type,
                indented: true,
                sourceLineIndex: i
              });
            }
          }
        }
        break;
      }
    }
  }

  return lines;
}

function wrapLineForViewport(text: string, width: number): string[] {
  if (width <= 0) return [text];

  // Strip ANSI codes to calculate actual width
  const cleanText = text.replace(/\u001b\[[0-9;]+m/g, '');
  const visualWidth = getVisualWidth(cleanText);

  if (visualWidth <= width) {
    return [text];
  }

  // Need to wrap - preserve ANSI codes while wrapping
  const wrapped: string[] = [];
  let currentLine = '';
  let currentWidth = 0;
  let i = 0;

  while (i < text.length) {
    // Check for ANSI escape sequence
    if (text[i] === '\u001b' && text[i + 1] === '[') {
      // Find the end of the ANSI sequence
      let j = i + 2;
      while (j < text.length && !/[mGKHf]/.test(text[j])) {
        j++;
      }
      if (j < text.length) {
        // Include the entire ANSI sequence in current line
        currentLine += text.slice(i, j + 1);
        i = j + 1;
        continue;
      }
    }

    // Regular character
    const char = text[i];
    const charWidth = getVisualWidth(char);

    if (currentWidth + charWidth > width) {
      // Need to wrap
      wrapped.push(currentLine);
      currentLine = char;
      currentWidth = charWidth;
    } else {
      currentLine += char;
      currentWidth += charWidth;
    }

    i++;
  }

  if (currentLine) {
    wrapped.push(currentLine);
  }

  return wrapped.length > 0 ? wrapped : [text];
}

function isCollapsibleBlock(block: OutputBlockData): boolean {
  return block.type === 'subagent' || block.type === 'tool-group';
}