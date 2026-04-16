export type MediaType = 'image' | 'video' | 'document';
export type TypeFilter = 'all' | MediaType;
export type SortBy = 'date' | 'size';
export type MediaSource = 'seeded' | 'upload';
export type PreviewKind = 'poster' | 'generated';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  size: number;
  createdAt: string;
  previewUrl?: string | null;
  previewKind?: PreviewKind;
}

export interface PaginatedMediaResponse {
  items: MediaItem[];
  nextPage: number | null;
  total: number;
}

export type FetchState =
  | { status: 'idle' }
  | { status: 'loading'; page: number }
  | { status: 'success' }
  | { status: 'error'; page: number; message: string };

export type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'done' }
  | { status: 'error'; message: string };

export interface MediaEntity extends MediaItem {
  source: MediaSource;
  previewStatus: PreviewState;
  previewUrl: string | null;
  previewKind: PreviewKind;
  uploadState: UploadState;
  errorMessage: string | null;
}

export interface UploadValidationIssue {
  id: string;
  name: string;
  message: string;
}
