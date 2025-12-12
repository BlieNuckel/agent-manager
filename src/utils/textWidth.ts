import stringWidth from 'string-width';

export function getVisualWidth(text: string): number {
  return stringWidth(text);
}

export function wrapTextToWidth(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) {
    return [text];
  }

  const visualWidth = getVisualWidth(text);

  if (visualWidth <= maxWidth) {
    return [text];
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const char of text) {
    const testLine = currentLine + char;
    const testWidth = getVisualWidth(testLine);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        lines.push(char);
        currentLine = '';
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

export function splitIntoWrappedLines(
  text: string,
  maxWidth: number,
  preserveLeadingSpaces: boolean = false
): string[] {
  if (maxWidth <= 0) {
    return [text];
  }

  const wrappedLines = wrapTextToWidth(text, maxWidth);

  if (!preserveLeadingSpaces) {
    return wrappedLines;
  }

  return wrappedLines.map((line, idx) => {
    if (idx > 0) {
      return '  ' + line;
    }
    return line;
  });
}

export function truncateToWidth(text: string, maxWidth: number, ellipsis: string = '...'): string {
  const visualWidth = getVisualWidth(text);

  if (visualWidth <= maxWidth) {
    return text;
  }

  const ellipsisWidth = getVisualWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  if (targetWidth <= 0) {
    return ellipsis.substring(0, Math.max(0, maxWidth));
  }

  let result = '';

  for (const char of text) {
    const testResult = result + char;
    const testWidth = getVisualWidth(testResult);

    if (testWidth > targetWidth) {
      break;
    }

    result = testResult;
  }

  return result + ellipsis;
}
