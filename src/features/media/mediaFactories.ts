import { getMockThumbnailForType } from '../../assets/mockThumbnails';
import type { MediaEntity, MediaItem } from './types';

export function toSeededMediaEntity(item: MediaItem): MediaEntity {
  return {
    ...item,
    source: 'seeded',
    previewStatus: { status: 'ready' },
    previewUrl: getMockThumbnailForType(item.type),
    previewKind: 'poster',
    uploadState: { status: 'idle' },
    errorMessage: null
  };
}

export function createOptimisticMediaEntity(
  id: string,
  file: File,
  mediaType: 'image' | 'video'
): MediaEntity {
  const createdAt = new Date().toISOString();

  return {
    id,
    name: file.name,
    type: mediaType,
    size: file.size,
    createdAt,
    source: 'upload',
    previewStatus: { status: 'loading' },
    previewUrl: getMockThumbnailForType(mediaType),
    previewKind: 'poster',
    uploadState: { status: 'uploading', progress: 0 },
    errorMessage: null
  };
}
