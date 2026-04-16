import type { MediaEntity, MediaItem, MediaType } from './types';
import { getDocumentPreviewUrl } from './documentPreview';

function getDefaultPreviewUrl(type: MediaType): string | null {
  if (type === 'document') {
    return getDocumentPreviewUrl();
  }

  return null;
}

export function toSeededMediaEntity(item: MediaItem): MediaEntity {
  const previewUrl = item.previewUrl ?? getDefaultPreviewUrl(item.type);

  return {
    ...item,
    source: 'seeded',
    previewStatus: previewUrl ? { status: 'ready' } : { status: 'idle' },
    previewUrl,
    previewKind: item.previewKind ?? 'poster',
    uploadState: { status: 'idle' },
    errorMessage: null
  };
}

export function createOptimisticMediaEntity(
  id: string,
  file: File,
  mediaType: MediaType
): MediaEntity {
  const createdAt = new Date().toISOString();
  const hasGeneratedPreview = mediaType === 'image' || mediaType === 'video';
  const previewUrl = getDefaultPreviewUrl(mediaType);

  return {
    id,
    name: file.name,
    type: mediaType,
    size: file.size,
    createdAt,
    source: 'upload',
    previewStatus: hasGeneratedPreview ? { status: 'loading' } : { status: 'ready' },
    previewUrl,
    previewKind: 'poster',
    uploadState: { status: 'uploading', progress: 0 },
    errorMessage: null
  };
}
