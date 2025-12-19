import MarkdownIt from 'markdown-it';
import { Chalk } from 'chalk';
import type { StateCore, StateInline, StateBlock } from 'markdown-it/lib/rules_core/state_core.js';
import type Renderer from 'markdown-it/lib/renderer.js';
import type Token from 'markdown-it/lib/token.js';

// Force chalk to always output colors
const chalk = new Chalk({ level: 3 });

// Track list state
interface ListState {
  depth: number;
  ordered: boolean;
  counter: number;
}

const listStack: ListState[] = [];
let currentIndent = 0;

// Helper to get list marker
function getListMarker(ordered: boolean, counter: number): string {
  return ordered ? `${counter}. ` : '• ';
}

// Helper to get indentation
function getIndent(depth: number): string {
  return '  '.repeat(depth);
}

export function createTerminalRenderer() {
  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
    breaks: true
  });

  const renderer = md.renderer;

  // Inline styles
  renderer.rules.strong_open = () => '\x1b[1m';
  renderer.rules.strong_close = () => '\x1b[22m';

  renderer.rules.em_open = () => '\x1b[3m';
  renderer.rules.em_close = () => '\x1b[23m';

  renderer.rules.code_inline = (tokens, idx) => {
    const token = tokens[idx];
    return chalk.yellow(token.content);
  };

  // Links
  renderer.rules.link_open = (tokens, idx) => {
    const token = tokens[idx];
    const href = token.attrGet('href') || '';
    return chalk.blue('[');
  };

  renderer.rules.link_close = (tokens, idx, options, env, renderer) => {
    // Find the link_open token
    let linkOpenIdx = idx;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'link_open') {
        linkOpenIdx = i;
        break;
      }
    }
    const href = tokens[linkOpenIdx].attrGet('href') || '';
    return chalk.blue(`](${href})`);
  };

  // Block elements
  renderer.rules.paragraph_open = () => '';
  renderer.rules.paragraph_close = () => '\n\n';

  // Headings
  renderer.rules.heading_open = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx];
    const level = parseInt(token.tag.slice(1));

    // Find the inline content between heading_open and heading_close
    let content = '';
    for (let i = idx + 1; i < tokens.length; i++) {
      if (tokens[i].type === 'heading_close') break;
      if (tokens[i].type === 'inline' && tokens[i].children) {
        // Render inline content
        content += renderer.renderInline(tokens[i].children || [], options, env);
      }
    }

    // Apply different shades of orange for different heading levels
    let styledContent;
    switch (level) {
      case 1:
        // Bright orange + bold + underline
        styledContent = chalk.hex('#FF6600').bold.underline(content);
        break;
      case 2:
        // Medium orange + bold
        styledContent = chalk.hex('#FF8533').bold(content);
        break;
      case 3:
        // Lighter orange + bold
        styledContent = chalk.hex('#FF9966').bold(content);
        break;
      case 4:
      case 5:
      case 6:
        // Even lighter orange + bold
        styledContent = chalk.hex('#FFB399').bold(content);
        break;
      default:
        styledContent = chalk.hex('#FFB399').bold(content);
    }

    // Skip the inline content tokens since we've already rendered them
    for (let i = idx + 1; i < tokens.length; i++) {
      if (tokens[i].type === 'heading_close') break;
      if (tokens[i].type === 'inline') {
        tokens[i].children = [];
      }
    }

    return styledContent;
  };


  renderer.rules.heading_close = (tokens, idx) => {
    const token = tokens[idx];
    const level = parseInt(token.tag.slice(1));
    // Return newlines based on level
    return '\n' + (level === 1 ? '\n' : '\n');
  };

  // Blockquotes
  renderer.rules.blockquote_open = () => '';
  renderer.rules.blockquote_close = () => '';

  // Override paragraph rendering inside blockquotes
  const originalParagraphOpen = renderer.rules.paragraph_open;
  const originalParagraphClose = renderer.rules.paragraph_close;

  renderer.rules.paragraph_open = (tokens, idx, options, env, renderer) => {
    // Check if we're inside a list item
    let insideListItem = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'list_item_close') break;
      if (tokens[i].type === 'list_item_open') {
        insideListItem = true;
        break;
      }
    }

    // Check if we're inside a blockquote
    let insideBlockquote = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'blockquote_close') break;
      if (tokens[i].type === 'blockquote_open') {
        insideBlockquote = true;
        break;
      }
    }

    if (insideListItem && listStack.length > 0) {
      const current = listStack[listStack.length - 1];
      const indent = getIndent(current.depth);
      const marker = getListMarker(current.ordered, current.counter);
      return indent + marker;
    }

    if (insideBlockquote) {
      return chalk.gray('│ ');
    }
    return originalParagraphOpen ? originalParagraphOpen(tokens, idx, options, env, renderer) : '';
  };

  renderer.rules.paragraph_close = (tokens, idx, options, env, renderer) => {
    // Check if we're inside a list item
    let insideListItem = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'list_item_close') break;
      if (tokens[i].type === 'list_item_open') {
        insideListItem = true;
        break;
      }
    }

    // Check if we're inside a blockquote
    let insideBlockquote = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'blockquote_close') break;
      if (tokens[i].type === 'blockquote_open') {
        insideBlockquote = true;
        break;
      }
    }

    if (insideListItem) {
      return '\n';
    }

    if (insideBlockquote) {
      return '\n';
    }
    return originalParagraphClose ? originalParagraphClose(tokens, idx, options, env, renderer) : '\n\n';
  };

  // Horizontal rule
  renderer.rules.hr = () => chalk.gray('─'.repeat(40)) + '\n\n';

  // Lists
  renderer.rules.bullet_list_open = () => {
    listStack.push({ depth: currentIndent, ordered: false, counter: 0 });
    currentIndent++;
    return '';
  };

  renderer.rules.bullet_list_close = () => {
    listStack.pop();
    currentIndent--;
    return currentIndent === 0 ? '\n' : '';
  };

  renderer.rules.ordered_list_open = (tokens, idx) => {
    const token = tokens[idx];
    const start = token.attrGet('start') ? parseInt(token.attrGet('start')!) : 1;
    listStack.push({ depth: currentIndent, ordered: true, counter: start - 1 });
    currentIndent++;
    return '';
  };

  renderer.rules.ordered_list_close = () => {
    listStack.pop();
    currentIndent--;
    return currentIndent === 0 ? '\n' : '';
  };

  renderer.rules.list_item_open = () => {
    if (listStack.length > 0) {
      const current = listStack[listStack.length - 1];
      current.counter++;
    }
    return '';
  };

  renderer.rules.list_item_close = () => {
    // List items are handled by custom paragraph rendering inside lists
    return '';
  };

  // Code blocks
  renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = token.info || '';
    const lang = info.split(/\s+/)[0];
    const code = token.content;

    // Style code blocks with a vertical line and indentation
    // This approach works without background colors and leaves room for syntax highlighting
    const lines = code.split('\n');
    const formattedLines = lines
      .filter((_, i) => i < lines.length - 1 || lines[i] !== '')
      .map(line => chalk.gray('│ ') + chalk.gray(line));

    // Add a header line with language info if available
    const header = lang
      ? chalk.gray('┌─ ') + chalk.cyan(lang) + '\n'
      : chalk.gray('┌─ code\n');

    // Add a footer line
    const footer = chalk.gray('└─');

    return header + formattedLines.join('\n') + '\n' + footer + '\n\n';
  };

  renderer.rules.code_block = renderer.rules.fence;

  // Tables
  renderer.rules.table_open = () => '';
  renderer.rules.table_close = () => '\n';
  renderer.rules.thead_open = () => '';
  renderer.rules.thead_close = () => '';
  renderer.rules.tbody_open = () => '';
  renderer.rules.tbody_close = () => '';
  renderer.rules.tr_open = () => '';
  renderer.rules.tr_close = () => '\n';

  renderer.rules.th_open = () => chalk.cyan('');
  renderer.rules.th_close = () => chalk.gray(' │ ');

  renderer.rules.td_open = () => '';
  renderer.rules.td_close = () => chalk.gray(' │ ');

  // Line breaks
  renderer.rules.softbreak = () => '\n';
  renderer.rules.hardbreak = () => '\n';

  // Text
  renderer.rules.text = (tokens, idx) => {
    return tokens[idx].content;
  };

  return md;
}

export function renderMarkdown(markdown: string): string {
  try {
    // Reset list state
    listStack.length = 0;
    currentIndent = 0;

    let frontmatterContent = '';
    let mainContent = markdown;

    // Check if content starts with frontmatter (---)
    if (markdown.trimStart().startsWith('---')) {
      const lines = markdown.split('\n');
      let endIndex = -1;

      // Find the closing --- (must be after the first line)
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          endIndex = i;
          break;
        }
      }

      if (endIndex !== -1) {
        // Extract frontmatter and main content
        const frontmatterLines = lines.slice(0, endIndex + 1);
        frontmatterContent = frontmatterLines
          .map(line => chalk.gray(line))
          .join('\n') + '\n';

        mainContent = lines.slice(endIndex + 1).join('\n');
      }
    }

    const renderer = createTerminalRenderer();
    const renderedMain = renderer.render(mainContent);

    // Combine frontmatter and main content
    const result = frontmatterContent + renderedMain;

    // Clean up any trailing newlines
    return result.trimEnd();
  } catch (error) {
    console.error('Markdown rendering error:', error);
    // If rendering fails, return the original markdown
    return markdown;
  }
}