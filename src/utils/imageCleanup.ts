import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { TEMP_IMAGES_DIR } from './imageStorage.js';
import { existsSync } from 'fs';

export async function cleanupOldTempImages(maxAgeMs: number = 24 * 60 * 60 * 1000) {
  if (!existsSync(TEMP_IMAGES_DIR)) return;

  try {
    const files = await readdir(TEMP_IMAGES_DIR);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      const filePath = join(TEMP_IMAGES_DIR, file);
      const stats = await stat(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        await unlink(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old temporary image(s)`);
    }
  } catch (error) {
    console.error('Error cleaning up temp images:', error);
  }
}

export async function cleanupImagesByIds(imageIds: string[]) {
  for (const id of imageIds) {
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    for (const ext of extensions) {
      const filePath = join(TEMP_IMAGES_DIR, `${id}.${ext}`);
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }
}
