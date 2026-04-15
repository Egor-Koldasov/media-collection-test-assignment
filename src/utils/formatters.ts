import type { MediaType } from '../features/media/types';

const fileSizeFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1
});

const typeLabels: Record<MediaType, string> = {
  image: 'Image',
  video: 'Video',
  document: 'Document'
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${fileSizeFormatter.format(bytes / 1024)} KB`;
  }

  return `${fileSizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export function formatMediaType(type: MediaType): string {
  return typeLabels[type];
}
