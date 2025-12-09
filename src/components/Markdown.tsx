import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

interface MarkdownProps {
  children: string;
}

export const Markdown = ({ children }: MarkdownProps) => {
  marked.setOptions({ renderer: new TerminalRenderer() });
  const rendered = marked.parse(children);
  const text = typeof rendered === 'string' ? rendered.trim() : '';
  return <Text>{text}</Text>;
};

export default Markdown;
