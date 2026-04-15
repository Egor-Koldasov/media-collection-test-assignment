import {
  ACCEPTED_UPLOAD_LABEL,
  ACCEPTED_UPLOAD_TYPES,
  MAX_FILE_BYTES,
  MAX_FILES_PER_BATCH
} from './constants';
import type { MediaType, UploadValidationIssue } from './types';

export interface ValidatedMediaFile {
  file: File;
  mediaType: Extract<MediaType, 'image' | 'video'>;
}

const acceptedTypeSet = new Set<string>(ACCEPTED_UPLOAD_TYPES);

export function getUploadMediaType(
  mimeType: string
): Extract<MediaType, 'image' | 'video'> | null {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType === 'video/mp4') {
    return 'video';
  }

  return null;
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

    if (!acceptedTypeSet.has(file.type as (typeof ACCEPTED_UPLOAD_TYPES)[number])) {
      issues.push({
        id: issueId,
        name: file.name,
        message: `Unsupported format. Choose ${ACCEPTED_UPLOAD_LABEL}.`
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

    if (!mediaType) {
      issues.push({
        id: issueId,
        name: file.name,
        message: 'This file type is not supported.'
      });
      return;
    }

    validFiles.push({ file, mediaType });
  });

  return { validFiles, issues };
}
