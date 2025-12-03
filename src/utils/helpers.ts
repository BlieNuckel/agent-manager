export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatTimeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function formatToolInput(input: unknown): string {
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    if ('file_path' in obj) return String(obj.file_path);
    if ('command' in obj) return String(obj.command).slice(0, 60);
    if ('content' in obj) return `file: ${obj.file_path || 'unknown'}`;
    return JSON.stringify(input).slice(0, 80);
  }
  return String(input).slice(0, 60);
}
