import React, { ReactNode } from 'react';
import { Box, Text, useStdout } from 'ink';

type PositionPreset = 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface CustomPosition {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
}

type SizeValue = number | `${number}%`;

export interface FloatingWindowProps {
  children: ReactNode;
  width?: SizeValue;
  height?: SizeValue;
  position?: PositionPreset | CustomPosition;
  showBorder?: boolean;
  borderColor?: string;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
  title?: string;
  padding?: number;
  showBackdrop?: boolean;
  backdropDim?: boolean;
}

const computeSize = (size: SizeValue | undefined, terminalSize: number, defaultSize: number): number => {
  if (size === undefined) return defaultSize;
  if (typeof size === 'number') return size;
  const percent = parseInt(size);
  return Math.floor(terminalSize * (percent / 100));
};

const computePosition = (
  position: PositionPreset | CustomPosition,
  windowWidth: number,
  windowHeight: number,
  terminalWidth: number,
  terminalHeight: number
): { top?: number; left?: number; bottom?: number; right?: number } => {
  if (typeof position === 'object') {
    return position;
  }

  const centerTop = Math.max(0, Math.floor((terminalHeight - windowHeight) / 2));
  const centerLeft = Math.max(0, Math.floor((terminalWidth - windowWidth) / 2));

  switch (position) {
    case 'center':
      return { top: centerTop, left: centerLeft };
    case 'top':
      return { top: 1, left: centerLeft };
    case 'bottom':
      return { bottom: 1, left: centerLeft };
    case 'top-left':
      return { top: 1, left: 1 };
    case 'top-right':
      return { top: 1, right: 1 };
    case 'bottom-left':
      return { bottom: 1, left: 1 };
    case 'bottom-right':
      return { bottom: 1, right: 1 };
    default:
      return { top: centerTop, left: centerLeft };
  }
};

export const FloatingWindow = ({
  children,
  width = 60,
  height,
  position = 'center',
  showBorder = true,
  borderColor = 'cyan',
  borderStyle = 'round',
  title,
  padding = 1,
  showBackdrop = true,
  backdropDim = true,
}: FloatingWindowProps) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const terminalHeight = stdout?.rows ?? 24;

  const computedWidth = computeSize(width, terminalWidth, 60);
  const computedHeight = height !== undefined
    ? computeSize(height, terminalHeight, 20)
    : undefined;

  const pos = computePosition(
    position,
    computedWidth,
    computedHeight ?? 20,
    terminalWidth,
    terminalHeight
  );

  return (
    <>
      {showBackdrop && (
        <Box
          position="absolute"
          width={terminalWidth}
          height={terminalHeight}
          top={0}
          left={0}
        >
          {backdropDim && (
            <Box width="100%" height="100%" flexDirection="column">
              {Array.from({ length: terminalHeight }, (_, i) => (
                <Text key={i} dimColor>
                  {' '.repeat(terminalWidth)}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Box
        position="absolute"
        width={computedWidth}
        height={computedHeight}
        top={pos.top}
        left={pos.left}
        bottom={pos.bottom}
        right={pos.right}
        flexDirection="column"
      >
        <Box
          flexDirection="column"
          width="100%"
          height="100%"
          borderStyle={showBorder ? borderStyle : undefined}
          borderColor={showBorder ? borderColor : undefined}
          padding={padding}
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
