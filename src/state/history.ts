import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { HistoryEntry } from '../types';

const DATA_DIR = path.join(os.homedir(), '.agent-manager');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadHistory(): HistoryEntry[] {
  ensureDataDir();
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      return data.map((e: any) => ({ ...e, date: new Date(e.date) }));
    }
  } catch { }
  return [];
}

export function saveHistory(history: HistoryEntry[]) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 20), null, 2));
}
