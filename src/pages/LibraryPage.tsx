import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import type { CustomAgentType } from '../types/agentTypes';
import type { Template } from '../types/templates';
import type { Workflow } from '../types/workflows';
import type { LibraryItem, LibraryItemType, LibraryFilters } from '../types/library';
import ScrollableMarkdown from '../components/ScrollableMarkdown';

interface LibraryPageProps {
  agentTypes: CustomAgentType[];
  templates: Template[];
  workflows: Workflow[];
  selectedIdx: number;
  onIdxChange: (idx: number) => void;
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showPreview: boolean;
  onPreviewToggle: () => void;
  onSelect: (item: LibraryItem) => void;
  onBack: () => void;
}

const getItemTypeTag = (type: LibraryItemType): { text: string; color: string } => {
  switch (type) {
    case 'agent': return { text: '[agent]', color: 'green' };
    case 'template': return { text: '[artifact]', color: 'yellow' };
    case 'workflow': return { text: '[workflow]', color: 'blue' };
  }
};

const getItemTypeLabel = (type: LibraryItemType): string => {
  switch (type) {
    case 'agent': return 'Agent';
    case 'template': return 'Template';
    case 'workflow': return 'Workflow';
  }
};

const getSourceLabel = (source: 'system' | 'user' | 'project'): string => {
  switch (source) {
    case 'system': return 'System';
    case 'user': return 'User';
    case 'project': return 'Project';
  }
};

export const LibraryPage = ({
  agentTypes,
  templates,
  workflows,
  selectedIdx,
  onIdxChange,
  filters,
  onFiltersChange,
  searchQuery,
  onSearchQueryChange,
  showPreview,
  onPreviewToggle,
  onSelect,
  onBack
}: LibraryPageProps) => {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Convert all items to LibraryItem format
  const allItems = useMemo(() => {
    const items: LibraryItem[] = [];

    // Add agents
    for (const agent of agentTypes) {
      items.push({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: 'agent',
        source: agent.source,
        path: agent.path,
        data: agent
      });
    }

    // Add templates
    for (const template of templates) {
      items.push({
        id: template.id,
        name: template.name,
        description: template.description,
        type: 'template',
        source: template.source,
        path: template.path,
        data: template
      });
    }

    // Add workflows
    for (const workflow of workflows) {
      items.push({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        type: 'workflow',
        source: workflow.source,
        path: workflow.path,
        data: workflow
      });
    }

    return items;
  }, [agentTypes, templates, workflows]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Type filter
      if (!filters.types.has(item.type)) return false;

      // Source filter
      if (!filters.sources.has(item.source)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allItems, filters, searchQuery]);

  // Load preview content when selection changes
  useEffect(() => {
    if (!showPreview || selectedIdx >= filteredItems.length) {
      return;
    }

    const item = filteredItems[selectedIdx];
    if (!item) return;

    const loadPreview = async () => {
      setLoadingPreview(true);
      try {
        const content = await fs.promises.readFile(item.path, 'utf-8');
        setPreviewContent(content);
      } catch (err) {
        setPreviewContent(`Error loading preview: ${err}`);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadPreview();
  }, [selectedIdx, filteredItems, showPreview]);

  // Ensure selectedIdx is within bounds
  useEffect(() => {
    if (selectedIdx >= filteredItems.length && filteredItems.length > 0) {
      onIdxChange(filteredItems.length - 1);
    }
  }, [filteredItems.length, selectedIdx, onIdxChange]);

  useInput((input, key) => {
    if (filterMenuOpen) {
      if (key.escape || input === 'f') {
        setFilterMenuOpen(false);
        return;
      }

      // Type filters
      if (input === '1') {
        const newTypes = new Set(filters.types);
        if (newTypes.has('agent')) {
          newTypes.delete('agent');
        } else {
          newTypes.add('agent');
        }
        onFiltersChange({ ...filters, types: newTypes });
      } else if (input === '2') {
        const newTypes = new Set(filters.types);
        if (newTypes.has('template')) {
          newTypes.delete('template');
        } else {
          newTypes.add('template');
        }
        onFiltersChange({ ...filters, types: newTypes });
      } else if (input === '3') {
        const newTypes = new Set(filters.types);
        if (newTypes.has('workflow')) {
          newTypes.delete('workflow');
        } else {
          newTypes.add('workflow');
        }
        onFiltersChange({ ...filters, types: newTypes });
      }

      // Source filters
      if (input === '4') {
        const newSources = new Set(filters.sources);
        if (newSources.has('system')) {
          newSources.delete('system');
        } else {
          newSources.add('system');
        }
        onFiltersChange({ ...filters, sources: newSources });
      } else if (input === '5') {
        const newSources = new Set(filters.sources);
        if (newSources.has('user')) {
          newSources.delete('user');
        } else {
          newSources.add('user');
        }
        onFiltersChange({ ...filters, sources: newSources });
      } else if (input === '6') {
        const newSources = new Set(filters.sources);
        if (newSources.has('project')) {
          newSources.delete('project');
        } else {
          newSources.add('project');
        }
        onFiltersChange({ ...filters, sources: newSources });
      }

      return;
    }

    if (searchMode) {
      if (key.escape) {
        setSearchMode(false);
        onSearchQueryChange(localSearchQuery);
        return;
      }

      if (key.return) {
        setSearchMode(false);
        onSearchQueryChange(localSearchQuery);
        return;
      }

      if (key.backspace || key.delete) {
        setLocalSearchQuery(localSearchQuery.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        setLocalSearchQuery(localSearchQuery + input);
      }

      return;
    }

    // Normal navigation
    if (key.escape || input === 'q') {
      onBack();
      return;
    }

    if (input === '/') {
      setSearchMode(true);
      setLocalSearchQuery(searchQuery);
      return;
    }

    if (input === 'f') {
      setFilterMenuOpen(true);
      return;
    }

    if (input === 'p') {
      onPreviewToggle();
      return;
    }

    if ((key.upArrow || input === 'k') && selectedIdx > 0) {
      onIdxChange(selectedIdx - 1);
    }

    if ((key.downArrow || input === 'j') && selectedIdx < filteredItems.length - 1) {
      onIdxChange(selectedIdx + 1);
    }

    if (key.return && filteredItems[selectedIdx]) {
      onSelect(filteredItems[selectedIdx]);
    }
  });

  const selectedItem = filteredItems[selectedIdx];

  return (
    <Box flexDirection="row" height="100%">
      <Box
        flexDirection="column"
        width={showPreview ? "40%" : "100%"}
        paddingRight={showPreview ? 1 : 0}
      >
        {/* Search bar */}
        {searchMode ? (
          <Box marginBottom={1}>
            <Text color="cyan">Search: </Text>
            <Text>{localSearchQuery}</Text>
            <Text color="gray" dimColor>_</Text>
          </Box>
        ) : searchQuery ? (
          <Box marginBottom={1}>
            <Text dimColor>Search: {searchQuery}</Text>
          </Box>
        ) : null}

        {/* Filter menu */}
        {filterMenuOpen && (
          <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="cyan" paddingX={1}>
            <Text color="cyan" bold>Filters</Text>
            <Box marginTop={1}>
              <Text>Type: </Text>
              <Text color={filters.types.has('agent') ? 'green' : 'gray'}>
                [1] Agents{' '}
              </Text>
              <Text color={filters.types.has('template') ? 'green' : 'gray'}>
                [2] Templates{' '}
              </Text>
              <Text color={filters.types.has('workflow') ? 'green' : 'gray'}>
                [3] Workflows
              </Text>
            </Box>
            <Box>
              <Text>Source: </Text>
              <Text color={filters.sources.has('system') ? 'green' : 'gray'}>
                [4] System{' '}
              </Text>
              <Text color={filters.sources.has('user') ? 'green' : 'gray'}>
                [5] User{' '}
              </Text>
              <Text color={filters.sources.has('project') ? 'green' : 'gray'}>
                [6] Project
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Press Esc or f to close</Text>
            </Box>
          </Box>
        )}

        {/* Item list */}
        <Box flexDirection="column" flexGrow={1}>
          {filteredItems.length === 0 ? (
            <Text dimColor>No items match your filters</Text>
          ) : (
            filteredItems.map((item, idx) => (
              <Box key={item.id} flexDirection="column" marginBottom={1}>
                <Box>
                  {idx === selectedIdx && <Text color="cyan">▶ </Text>}
                  {idx !== selectedIdx && <Text>  </Text>}
                  <Text color={getItemTypeTag(item.type).color} bold>
                    {getItemTypeTag(item.type).text}
                  </Text>
                  <Text> </Text>
                  <Text color={idx === selectedIdx ? 'cyan' : undefined} bold={idx === selectedIdx}>
                    {item.name}
                  </Text>
                  <Text dimColor> [{getSourceLabel(item.source)}]</Text>
                </Box>
                <Box paddingLeft={2}>
                  <Text dimColor wrap="truncate-end">{item.description}</Text>
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* Status bar */}
        <Box marginTop={1}>
          <Text dimColor>
            {filteredItems.length} items
            {searchQuery && ` (filtered from ${allItems.length})`}
          </Text>
        </Box>
      </Box>

      {/* Preview pane */}
      {showPreview && (
        <Box
          width="60%"
          flexDirection="column"
        >
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="cyan">{selectedItem?.name || 'No selection'}</Text>
            {selectedItem && (
              <Text dimColor>{getItemTypeTag(selectedItem.type).text} - {getSourceLabel(selectedItem.source)}</Text>
            )}
          </Box>
          {selectedItem && (
            <Box flexGrow={1} paddingX={1}>
              {loadingPreview ? (
                <Text dimColor>Loading preview...</Text>
              ) : (
                <ScrollableMarkdown
                  content={previewContent}
                  keybindings="vi"
                />
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export const getLibraryHelp = () => {
  return (
    <>
      <Text color="cyan">↑↓jk</Text> Navigate{' '}
      <Text color="cyan">/</Text> Search{' '}
      <Text color="cyan">f</Text> Filters{' '}
      <Text color="cyan">p</Text> Preview{' '}
      <Text color="cyan">Enter</Text> Select{' '}
      <Text color="cyan">Esc/q</Text> Back
    </>
  );
};