export const PAGE_SIZE = 12;
export const MAX_FILES_PER_BATCH = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PREVIEW_SIZE = 200;
export const ACCEPTED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4'
] as const;
export const ACCEPTED_UPLOAD_LABEL = 'JPEG, PNG, WEBP, MP4';
