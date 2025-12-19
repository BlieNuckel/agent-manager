import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { CompactListItem, CompactListSelectProps } from '../types/prompts';

export const CompactListSelect = ({
  items,
  selected,
  onSelect,
  header,
  footer,
  borderColor = 'yellow',
  multiSelect = false,
}: CompactListSelectProps) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Find initial selected index based on current selection
  useEffect(() => {
    if (!multiSelect && typeof selected === 'string') {
      const idx = items.findIndex(item => item.key === selected);
      if (idx !== -1) setSelectedIndex(idx);
    }
  }, [selected, items, multiSelect]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(idx => Math.max(0, idx - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex(idx => Math.min(items.length - 1, idx + 1));
      return;
    }

    if (key.return || input === ' ') {
      const item = items[selectedIndex];
      if (!item.disabled) {
        onSelect(item.key);
      }
      return;
    }

    // Direct shortcut selection
    const matchingItem = items.find(item => item.shortcut === input.toLowerCase());
    if (matchingItem && !matchingItem.disabled) {
      onSelect(matchingItem.key);
    }
  });

  const renderItem = (item: CompactListItem, idx: number) => {
    const isSelected = selectedIndex === idx;
    const isChecked = multiSelect
      ? Array.isArray(selected) && selected.includes(item.key)
      : selected === item.key;

    return (
      <Box key={item.key}>
        <Text color={item.disabled ? 'gray' : (isSelected ? borderColor : 'white')}>
          {isSelected ? '▸ ' : '  '}
        </Text>
        {multiSelect && (
          <Text color={item.disabled ? 'gray' : (isSelected ? borderColor : 'white')}>
            {isChecked ? '[✓] ' : '[ ] '}
          </Text>
        )}
        {item.shortcut && (
          <Text color={item.disabled ? 'gray' : 'cyan'} bold={!item.disabled}>
            [{item.shortcut}]
          </Text>
        )}
        <Text color={item.disabled ? 'gray' : (isSelected ? borderColor : 'white')} bold={isSelected && !item.disabled}>
          {item.shortcut ? item.label.substring(1) : item.label}
        </Text>
        {item.description && (
          <>
            <Text> </Text>
            <Text dimColor>{item.description}</Text>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" flexShrink={0} borderStyle="round" borderColor={borderColor} padding={1}>
      <Box>
        <Text color={borderColor} bold>
          {header}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {items.map((item, idx) => renderItem(item, idx))}
      </Box>

      {footer && (
        <Box marginTop={1}>
          <Text dimColor>{footer}</Text>
        </Box>
      )}
    </Box>
  );
};