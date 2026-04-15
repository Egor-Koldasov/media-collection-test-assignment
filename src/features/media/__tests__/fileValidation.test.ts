import { describe, expect, it } from 'vitest';

import { validateSelectedFiles } from '../fileValidation';

describe('validateSelectedFiles', () => {
  it('accepts supported files and reports type, size, and batch-limit issues', () => {
    const files = [
      new File(['image'], 'frame-1.png', { type: 'image/png' }),
      new File(['text'], 'notes.txt', { type: 'text/plain' }),
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'oversized.webp', {
        type: 'image/webp'
      }),
      new File(['image'], 'frame-2.jpg', { type: 'image/jpeg' }),
      new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
      new File(['image'], 'frame-3.png', { type: 'image/png' })
    ];

    const result = validateSelectedFiles(files);

    expect(result.validFiles).toHaveLength(3);
    expect(result.issues).toHaveLength(3);
    expect(result.issues.map((issue) => issue.message)).toEqual([
      'Unsupported format. Choose JPEG, PNG, WEBP, MP4.',
      'File exceeds the 10 MB size limit.',
      'Only 5 files can be uploaded at once.'
    ]);
  });
});
