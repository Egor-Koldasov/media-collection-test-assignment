import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_BATCH,
  SUPPORTED_IMAGE_AND_VIDEO_TYPES
} from './constants';
import type { MediaType, UploadValidationIssue } from './types';

export interface ValidatedMediaFile {
  file: File;
  mediaType: MediaType;
}

const supportedTypeSet = new Set<string>(SUPPORTED_IMAGE_AND_VIDEO_TYPES);

export function getUploadMediaType(mimeType: string): MediaType {
  if (supportedTypeSet.has(mimeType as (typeof SUPPORTED_IMAGE_AND_VIDEO_TYPES)[number])) {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType === 'video/mp4') {
      return 'video';
    }
  }

  return 'document';
}

export function validateSelectedFiles(files: File[]): {
  validFiles: ValidatedMediaFile[];
  issues: UploadValidationIssue[];
} {
  const validFiles: ValidatedMediaFile[] = [];
  const issues: UploadValidationIssue[] = [];

  files.forEach((file, index) => {
    const issueId = `${file.name}-${file.size}-${index}`;

    if (index >= MAX_FILES_PER_BATCH) {
      issues.push({
        id: issueId,
        name: file.name,
        message: `Only ${MAX_FILES_PER_BATCH} files can be uploaded at once.`
      });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      issues.push({
        id: issueId,
        name: file.name,
        message: 'File exceeds the 10 MB size limit.'
      });
      return;
    }

    const mediaType = getUploadMediaType(file.type);
    validFiles.push({ file, mediaType });
  });

  return { validFiles, issues };
}
