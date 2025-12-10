export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImage(base64: string, maxSizeMB: number = 5): ValidationResult {
  const buffer = Buffer.from(base64, 'base64');
  const sizeMB = buffer.length / (1024 * 1024);

  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `Image too large (${sizeMB.toFixed(1)}MB, max ${maxSizeMB}MB)`
    };
  }

  return { valid: true };
}

export function validateImageFormat(base64: string): ValidationResult {
  const validFormats = ['/9j/', 'iVBORw0KGgo', 'R0lGOD', 'UklGR'];
  const isValid = validFormats.some(header => base64.startsWith(header));

  if (!isValid) {
    return {
      valid: false,
      error: 'Unsupported image format (use JPEG, PNG, GIF, or WebP)'
    };
  }

  return { valid: true };
}
