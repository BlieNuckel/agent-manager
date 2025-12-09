#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { HoverWindow } from './components/HoverWindow.js';

const TestApp = () => {
  const [showWindow, setShowWindow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < 3) {
        setStep(step + 1);
        setShowWindow(true);
      } else {
        process.exit(0);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [step]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">HoverWindow Component Test</Text>
      <Text dimColor>Testing hover window functionality...</Text>

      <Box marginTop={2} flexDirection="column">
        <Text>Background content line 1</Text>
        <Text>Background content line 2</Text>
        <Text>Background content line 3</Text>
        <Text>Background content line 4</Text>
        <Text>Background content line 5</Text>
      </Box>

      <Box marginTop={2}>
        <Text>Current test: Step {step + 1}/3</Text>
      </Box>

      {showWindow && step === 0 && (
        <HoverWindow
          title="Test 1: Centered Window"
          width={50}
          height={8}
          position="center"
          borderColor="green"
          dimBackground={false}
        >
          <Box flexDirection="column">
            <Text color="green">✓ Centered window rendering</Text>
            <Text dimColor>This window is positioned in the center</Text>
          </Box>
        </HoverWindow>
      )}

      {showWindow && step === 1 && (
        <HoverWindow
          title="Test 2: Top-Right Notification"
          width={45}
          position={{ top: 3, right: 2 }}
          borderColor="yellow"
          borderStyle="round"
        >
          <Box flexDirection="column">
            <Text color="yellow">⚠ Top-right positioned window</Text>
            <Text dimColor>Using custom coordinates</Text>
          </Box>
        </HoverWindow>
      )}

      {showWindow && step === 2 && (
        <HoverWindow
          title="Test 3: Percentage-based Sizing"
          width="70%"
          height="40%"
          position="center"
          borderColor="cyan"
          dimBackground={true}
        >
          <Box flexDirection="column">
            <Text bold color="cyan">Percentage-based sizing test</Text>
            <Box marginTop={1}>
              <Text>Width: 70% of terminal</Text>
            </Box>
            <Box marginTop={1}>
              <Text>Height: 40% of terminal</Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Background is dimmed</Text>
            </Box>
          </Box>
        </HoverWindow>
      )}
    </Box>
  );
};

render(<TestApp />);
