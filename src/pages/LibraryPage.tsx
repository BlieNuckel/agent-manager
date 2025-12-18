import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import fs from 'fs';
import type { CustomAgentType } from '../types/agentTypes';
import type { Template } from '../types/templates';
import type { Workflow } from '../types/workflows';
import type { LibraryItem, LibraryItemType, LibraryFilters } from '../types/library';
import ScrollableMarkdown from '../components/ScrollableMarkdown';
import { LibraryItem as LibraryItemComponent } from '../components/LibraryItem';
import { useDebounce } from '../utils/useDebounce';

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

// Helper functions for UI display
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

// Memoized spacer components to prevent re-renders
const Spacer = memo(({ height }: { height: number }) => {
  return <Box height={height} />;
});

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
  const [previewMode, setPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Debounce search query to prevent excessive re-renders
  const debouncedSearchQuery = useDebounce(localSearchQuery, 150);

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

  // Sync debounced search query with parent component
  useEffect(() => {
    if (!searchMode && debouncedSearchQuery !== searchQuery) {
      onSearchQueryChange(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, searchQuery, onSearchQueryChange, searchMode]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Type filter
      if (!filters.types.has(item.type)) return false;

      // Source filter
      if (!filters.sources.has(item.source)) return false;

      // Search filter - use debounced query during search mode
      const query = searchMode ? debouncedSearchQuery : searchQuery;
      if (query) {
        const lowerQuery = query.toLowerCase();
        return (
          item.name.toLowerCase().includes(lowerQuery) ||
          item.description.toLowerCase().includes(lowerQuery) ||
          item.id.toLowerCase().includes(lowerQuery)
        );
      }

      return true;
    });
  }, [allItems, filters, searchQuery, searchMode, debouncedSearchQuery]);

  // Track previous filtered items to detect actual list changes
  const prevFilteredItemsRef = useRef(filteredItems);
  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;

  // More intelligent index adjustment that preserves selection when possible
  useEffect(() => {
    const prevItems = prevFilteredItemsRef.current;
    const currentLength = filteredItems.length;

    // Only adjust index if the list actually changed
    if (prevItems !== filteredItems) {
      prevFilteredItemsRef.current = filteredItems;

      // If we have items and current index is out of bounds
      if (currentLength > 0 && selectedIdxRef.current >= currentLength) {
        // Try to maintain relative position instead of jumping to end
        const relativePosition = selectedIdxRef.current / (prevItems.length || 1);
        const newIdx = Math.min(
          Math.floor(relativePosition * currentLength),
          currentLength - 1
        );
        onIdxChange(newIdx);
      } else if (currentLength === 0 && selectedIdxRef.current !== 0) {
        onIdxChange(0);
      }
      // If selected item still exists at same index, don't adjust
    }
  }, [filteredItems, onIdxChange]);

  // Load preview content only when entering preview mode
  const loadPreviewContent = useCallback(async (item: LibraryItem) => {
    setLoadingPreview(true);
    try {
      const content = await fs.promises.readFile(item.path, 'utf-8');
      setPreviewContent(content);
    } catch (err) {
      setPreviewContent(`Error loading preview: ${err}`);
    } finally {
      setLoadingPreview(false);
    }
  }, []);


  useInput((input, key) => {
    // Handle preview mode navigation first
    if (previewMode) {
      if (key.escape || input === 'q') {
        setPreviewMode(false);
        onPreviewToggle(); // Notify parent that we're exiting preview
        return;
      }
      // Let ScrollableMarkdown handle other keys in preview mode
      return;
    }

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
        setLocalSearchQuery(searchQuery); // Reset to original search query
        return;
      }

      if (key.return) {
        setSearchMode(false);
        // Let the debounced effect handle the actual update
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

    if ((key.upArrow || input === 'k') && selectedIdx > 0) {
      onIdxChange(selectedIdx - 1);
    }

    if ((key.downArrow || input === 'j') && selectedIdx < filteredItems.length - 1) {
      onIdxChange(selectedIdx + 1);
    }

    if (key.return && filteredItems[selectedIdx]) {
      const item = filteredItems[selectedIdx];
      setPreviewMode(true);
      onPreviewToggle(); // Notify parent that we're entering preview
      loadPreviewContent(item);
    }
  });

  const selectedItem = filteredItems[selectedIdx];
  const { stdout } = useStdout();
  const termHeight = stdout?.rows || 24;

  // Viewport calculations for virtualization
  const itemHeight = 3; // Each library item takes 3 lines (title + description + margin)
  const headerHeight = searchMode || searchQuery ? 2 : 0; // Search bar height
  const filterMenuHeight = filterMenuOpen ? 7 : 0;
  const statusBarHeight = 1;
  const availableHeight = termHeight - 5 - headerHeight - filterMenuHeight - statusBarHeight; // -5 for app header/help
  const visibleItemCount = Math.floor(availableHeight / itemHeight);

  // Calculate viewport window with hysteresis to reduce re-renders
  const [viewportStart, setViewportStart] = useState(0);

  // Reset viewport when filtered items change
  useEffect(() => {
    setViewportStart(0);
  }, [filteredItems]);

  useEffect(() => {
    // Only update viewport when selected item moves outside visible range
    const currentEnd = viewportStart + visibleItemCount;

    if (selectedIdx < viewportStart) {
      // Selected item is above viewport - scroll up
      setViewportStart(Math.max(0, selectedIdx));
    } else if (selectedIdx >= currentEnd) {
      // Selected item is below viewport - scroll down
      setViewportStart(Math.max(0, selectedIdx - visibleItemCount + 1));
    }
    // Otherwise, keep the viewport stable (no update)
  }, [selectedIdx, viewportStart, visibleItemCount]);

  const viewportEnd = Math.min(viewportStart + visibleItemCount, filteredItems.length);
  const visibleItems = filteredItems.slice(viewportStart, viewportEnd);

  // If in preview mode, show full-screen preview
  if (previewMode && selectedItem) {
    // Calculate available height for preview
    const appHeaderHeight = 1;
    const appHelpBarHeight = 3;
    const availableForPage = termHeight - appHeaderHeight - appHelpBarHeight;
    const previewHeaderHeight = 3;
    const scrollIndicatorHeight = 1;
    const visibleLines = Math.max(1, availableForPage - previewHeaderHeight - scrollIndicatorHeight);

    return (
      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold color="cyan">{selectedItem.name}</Text>
            <Text> </Text>
            <Text color={getItemTypeTag(selectedItem.type).color} bold>
              {getItemTypeTag(selectedItem.type).text}
            </Text>
            <Text dimColor> [{getSourceLabel(selectedItem.source)}]</Text>
          </Box>
          <Text dimColor>{selectedItem.description}</Text>
          <Text dimColor>{selectedItem.path}</Text>
        </Box>

        {loadingPreview ? (
          <Text dimColor>Loading preview...</Text>
        ) : (
          <ScrollableMarkdown
            content={previewContent}
            height={visibleLines}
            keybindings="vi"
            onBack={() => {
              setPreviewMode(false);
              onPreviewToggle(); // Notify parent that we're exiting preview
            }}
          />
        )}
      </Box>
    );
  }

  // Otherwise show the list view
  return (
    <Box flexDirection="column" height="100%">
        {/* Search bar */}
        {searchMode ? (
          <Box marginBottom={1}>
            <Text color="cyan">Search: </Text>
            <Text>{localSearchQuery}</Text>
            <Text color="gray" dimColor>_</Text>
          </Box>
        ) : (searchQuery || debouncedSearchQuery) ? (
          <Box marginBottom={1}>
            <Text dimColor>Search: {searchQuery || debouncedSearchQuery}</Text>
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

        {/* Item list - virtualized rendering */}
        <Box flexDirection="column" flexGrow={1}>
          {filteredItems.length === 0 ? (
            <Text dimColor>No items match your filters</Text>
          ) : (
            <>
              {/* Spacer for items above viewport */}
              {viewportStart > 0 && (
                <Spacer height={viewportStart * itemHeight} />
              )}

              {/* Render only visible items */}
              {visibleItems.map((item, localIdx) => {
                const globalIdx = viewportStart + localIdx;
                return (
                  <LibraryItemComponent
                    key={item.id}
                    item={item}
                    isSelected={globalIdx === selectedIdx}
                    index={globalIdx}
                  />
                );
              })}

              {/* Spacer for items below viewport */}
              {viewportEnd < filteredItems.length && (
                <Spacer height={(filteredItems.length - viewportEnd) * itemHeight} />
              )}
            </>
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
  );
};

export const getLibraryHelp = () => {
  return (
    <>
      <Text color="cyan">↑↓jk</Text> Navigate{' '}
      <Text color="cyan">/</Text> Search{' '}
      <Text color="cyan">f</Text> Filters{' '}
      <Text color="cyan">Enter</Text> Preview{' '}
      <Text color="cyan">Esc/q</Text> Back
    </>
  );
};

export const getLibraryPreviewHelp = () => {
  return (
    <>
      <Text color="cyan">↑↓jk</Text> Scroll{' '}
      <Text color="cyan">^D/^U</Text> Half-page{' '}
      <Text color="cyan">g/G</Text> Top/Bottom{' '}
      <Text color="cyan">Esc/q</Text> Back to list
    </>
  );
};