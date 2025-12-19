export interface CompactListItem {
  key: string;
  shortcut?: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface CompactListSelectProps {
  items: CompactListItem[];
  selected: string | string[];
  onSelect: (key: string) => void;
  header: string;
  footer?: string;
  borderColor?: string;
  multiSelect?: boolean;
}