import { join } from 'path';
import { homedir } from 'os';
import { mkdir } from 'fs/promises';

export const TEMP_IMAGES_DIR = join(homedir(), '.agent-manager', 'temp-images');

export async function ensureTempImageDir() {
  await mkdir(TEMP_IMAGES_DIR, { recursive: true });
}

export function getTempImagePath(imageId: string, extension: string = 'png'): string {
  return join(TEMP_IMAGES_DIR, `${imageId}.${extension}`);
}
