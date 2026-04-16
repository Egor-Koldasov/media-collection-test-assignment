import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearThumbnailCache,
  createPreviewCacheKey,
  getThumbnailBlob,
  setThumbnailBlob
} from '../thumbnailCache';

describe('thumbnailCache', () => {
  beforeEach(async () => {
    await clearThumbnailCache();
  });

  it('stores and retrieves preview blobs by file name and size', async () => {
    const file = new File(['original'], 'asset.png', { type: 'image/png' });
    const key = createPreviewCacheKey(file);
    const blob = new Blob(['thumbnail'], { type: 'image/png' });

    expect(key).toBe('asset.png:8');
    await setThumbnailBlob(key, blob);
    const storedBlob = await getThumbnailBlob(key);

    expect(storedBlob).not.toBeNull();
  });

  it('returns null for a cache miss', async () => {
    await expect(getThumbnailBlob('missing:file')).resolves.toBeNull();
  });
});
