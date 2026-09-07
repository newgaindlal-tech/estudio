const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

export function validateUploadedFile(file: File): FileValidationResult {
  // 1. Size Validation
  if (file.size <= 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds maximum permitted limit (10 MB).' };
  }

  // 2. Extension Validation
  const parts = file.name.split('.');
  if (parts.length < 2) {
    return { valid: false, error: 'Files without a valid extension are prohibited.' };
  }

  const ext = parts.pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type ".${ext}" is not permitted. Allowed: PDF, JPG, PNG, WEBP.`,
    };
  }

  // 3. MIME Type Validation
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Detected MIME type "${file.type}" is invalid or untrusted.`,
    };
  }

  // 4. Filename Sanitization (Remove control characters and path traversals)
  const baseName = parts.join('.').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedFilename = `${baseName}.${ext}`;

  return { valid: true, sanitizedFilename };
}

export function sanitizeTitle(input: string): string {
  // Strip out potential script tags or control characters
  return input.replace(/[<>"/\\`]/g, '').trim().slice(0, 100);
}