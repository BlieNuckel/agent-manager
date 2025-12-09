import React, { ReactNode } from 'react';
import { Box, Text, useStdout } from 'ink';

export interface HoverWindowProps {
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  position?: 'center' | { top?: number; left?: number; bottom?: number; right?: number };
  showBorder?: boolean;
  borderColor?: string;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
  title?: string;
  backgroundColor?: string;
  padding?: number;
  dimBackground?: boolean;
}

export const HoverWindow = ({
  children,
  width = 60,
  height,
  position = 'center',
  showBorder = true,
  borderColor = 'cyan',
  borderStyle = 'round',
  title,
  backgroundColor,
  padding = 1,
  dimBackground = false,
}: HoverWindowProps) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const terminalHeight = stdout?.rows ?? 24;

  const computedWidth = typeof width === 'string' && width.endsWith('%')
    ? Math.floor(terminalWidth * (parseInt(width) / 100))
    : typeof width === 'number'
    ? width
    : terminalWidth;

  const computedHeight = typeof height === 'string' && height.endsWith('%')
    ? Math.floor(terminalHeight * (parseInt(height) / 100))
    : typeof height === 'number'
    ? height
    : undefined;

  let top: number | undefined;
  let left: number | undefined;
  let bottom: number | undefined;
  let right: number | undefined;

  if (position === 'center') {
    top = Math.max(0, Math.floor((terminalHeight - (computedHeight ?? 10)) / 2));
    left = Math.max(0, Math.floor((terminalWidth - computedWidth) / 2));
  } else {
    const posObj = position as { top?: number; left?: number; bottom?: number; right?: number };
    top = posObj.top;
    left = posObj.left;
    bottom = posObj.bottom;
    right = posObj.right;
  }

  return (
    <>
      {dimBackground && (
        <Box
          position="absolute"
          width={terminalWidth}
          height={terminalHeight}
          top={0}
          left={0}
        >
          <Box width="100%" height="100%" flexDirection="column">
            {Array.from({ length: terminalHeight }, (_, i) => (
              <Text key={i} dimColor>
                {' '.repeat(terminalWidth)}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      <Box
        position="absolute"
        width={computedWidth}
        height={computedHeight}
        top={top}
        left={left}
        bottom={bottom}
        right={right}
        flexDirection="column"
      >
        <Box
          flexDirection="column"
          width="100%"
          height="100%"
          borderStyle={showBorder ? borderStyle : undefined}
          borderColor={showBorder ? borderColor : undefined}
          padding={padding}
          backgroundColor={backgroundColor}
        >
          {title && (
            <Box marginBottom={1}>
              <Text bold color={borderColor}>{title}</Text>
            </Box>
          )}
          {children}
        </Box>
      </Box>
    </>
  );
};
