import React from 'react';
import { Box, Text } from 'ink';
import type { ArtifactInfo } from '../utils/artifacts';

interface FilteredArtifact {
  index: number;
  name: string;
}

interface ArtifactMenuProps {
  artifacts: ArtifactInfo[];
  searchQuery: string;
  selectedIndex: number;
}

export const ArtifactMenu = ({ artifacts, searchQuery, selectedIndex }: ArtifactMenuProps) => {
  const noneOption: FilteredArtifact = { index: -1, name: 'None' };

  const getFilteredArtifacts = (): FilteredArtifact[] => {
    if (!searchQuery) {
      return [noneOption, ...artifacts.map((a, i) => ({ index: i, name: a.name }))];
    }
    const filter = searchQuery.toLowerCase();
    const filtered = artifacts
      .map((a, i) => ({ index: i, name: a.name }))
      .filter(a => a.name.toLowerCase().includes(filter));
    return [noneOption, ...filtered];
  };

  const filteredArtifacts = getFilteredArtifacts();

  if (artifacts.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} marginTop={1}>
        <Text color="yellow">No artifacts found in ~/.agent-manager/artifacts/</Text>
        <Text dimColor>Create artifacts by saving files to this directory</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} marginTop={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">Select Artifact</Text>
        <Text dimColor>(↑↓ to navigate, Enter to select, type to filter)</Text>
      </Box>

      {searchQuery && (
        <Box marginTop={1}>
          <Text>
            <Text dimColor>Filter: </Text>
            <Text color="cyan">{searchQuery}</Text>
          </Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        {filteredArtifacts.slice(0, 8).map((artifact, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={artifact.name} flexDirection="row">
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {isSelected ? '▸ ' : '  '}
                {artifact.name}
                {artifact.index === -1 && <Text dimColor> (no artifact included)</Text>}
              </Text>
            </Box>
          );
        })}
        {filteredArtifacts.length === 0 && (
          <Text color="yellow">No matches found for "{searchQuery}"</Text>
        )}
        {filteredArtifacts.length > 8 && (
          <Text dimColor>...and {filteredArtifacts.length - 8} more (type to filter)</Text>
        )}
      </Box>
    </Box>
  );
};
