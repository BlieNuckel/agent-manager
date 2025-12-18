import React from 'react';
import { Box, Text } from 'ink';
import type { LibraryItem, LibraryItemType } from '../types/library';

interface LibraryItemProps {
  item: LibraryItem;
  isSelected: boolean;
  index: number;
}

const getItemTypeTag = (type: LibraryItemType): { text: string; color: string } => {
  switch (type) {
    case 'agent': return { text: '[agent]', color: 'green' };
    case 'template': return { text: '[artifact]', color: 'yellow' };
    case 'workflow': return { text: '[workflow]', color: 'blue' };
  }
};

const getSourceLabel = (source: 'system' | 'user' | 'project'): string => {
  switch (source) {
    case 'system': return 'System';
    case 'user': return 'User';
    case 'project': return 'Project';
  }
};

export const LibraryItem = React.memo(({ item, isSelected, index }: LibraryItemProps) => {
  const typeTag = getItemTypeTag(item.type);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {isSelected && <Text color="cyan">▶ </Text>}
        {!isSelected && <Text>  </Text>}
        <Text color={typeTag.color} bold>
          {typeTag.text}
        </Text>
        <Text> </Text>
        <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
          {item.name}
        </Text>
        <Text dimColor> [{getSourceLabel(item.source)}]</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text dimColor wrap="truncate-end">{item.description}</Text>
      </Box>
    </Box>
  );
});

LibraryItem.displayName = 'LibraryItem';