import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DEBUG_LOG = path.join(os.homedir(), '.agent-manager', 'debug.log');

export function debug(...args: unknown[]) {
  try {
    const dir = path.dirname(DEBUG_LOG);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const message = args.map(a =>
      typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
    ).join(' ');
    fs.appendFileSync(DEBUG_LOG, `[${timestamp}] ${message}\n`);
  } catch (error) {
    console.error('Debug logging failed:', error);
  }
}

export function clearDebugLog() {
  const dir = path.dirname(DEBUG_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(DEBUG_LOG, `=== Agent Manager Debug Log ===\nStarted: ${new Date().toISOString()}\n\n`);
  } catch { }
}
