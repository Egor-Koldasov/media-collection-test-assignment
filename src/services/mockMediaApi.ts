import { PAGE_SIZE } from '../features/media/constants';
import type {
  MediaItem,
  MediaType,
  PaginatedMediaResponse
} from '../features/media/types';
import { isAbortError } from '../utils/errors';

const imageNames = [
  'Tabby sunbeam',
  'Calico closeup',
  'Whisker portrait',
  'Paws on parade',
  'Midnight zoomies',
  'Snoozing loaf',
  'Window watch'
];

const videoNames = [
  'Laser chase',
  'Curtain ambush',
  'Treat patrol',
  'Zoomies montage',
  'Cardboard kingdom',
  'Tail flick loop',
  'Sofa leap replay'
];

const documentNames = [
  'Brand brief',
  'Usage rights',
  'Project scope',
  'Vendor agreement',
  'Location notes',
  'Editorial rundown',
  'Approval sheet'
];

const imageExtensions = ['jpg', 'png', 'webp'];
const documentExtensions = ['pdf'];

function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function randomLatency(): number {
  return 500 + Math.floor(Math.random() * 501);
}

function sleep(duration: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, duration);

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Upload aborted.', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function extensionForType(type: MediaType, index: number): string {
  if (type === 'image') {
    return imageExtensions[index % imageExtensions.length];
  }

  if (type === 'video') {
    return 'mp4';
  }

  return documentExtensions[index % documentExtensions.length];
}

function nameForType(type: MediaType, index: number): string {
  if (type === 'image') {
    return imageNames[index % imageNames.length];
  }

  if (type === 'video') {
    return videoNames[index % videoNames.length];
  }

  return documentNames[index % documentNames.length];
}

function sizeForType(type: MediaType, index: number): number {
  if (type === 'image') {
    return 280_000 + index * 21_400;
  }

  if (type === 'video') {
    return 3_200_000 + index * 220_000;
  }

  return 140_000 + index * 9_500;
}

function createdAtForIndex(index: number): string {
  const now = Date.now();
  const hoursBetweenItems = 13;
  return new Date(now - index * hoursBetweenItems * 60 * 60 * 1000).toISOString();
}

function createMediaItem(index: number): MediaItem {
  const type = (['image', 'video', 'document'] as const)[index % 3];
  const localIndex = Math.floor(index / 3);
  const extension = extensionForType(type, localIndex);
  const baseName = nameForType(type, localIndex);

  return {
    id: `seed-${padNumber(index + 1)}`,
    name: `${baseName} ${padNumber(index + 1)}.${extension}`,
    type,
    size: sizeForType(type, localIndex),
    createdAt: createdAtForIndex(index)
  };
}

const mediaFixtures = Array.from({ length: 60 }, (_, index) => createMediaItem(index));

export async function fetchMediaPage(page: number): Promise<PaginatedMediaResponse> {
  await sleep(randomLatency());

  if (Math.random() < 0.15) {
    throw new Error('This section could not be loaded right now. Please retry.');
  }

  const startIndex = (page - 1) * PAGE_SIZE;
  const items = mediaFixtures.slice(startIndex, startIndex + PAGE_SIZE);

  return {
    items,
    nextPage: startIndex + PAGE_SIZE >= mediaFixtures.length ? null : page + 1,
    total: mediaFixtures.length
  };
}

export async function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<{ url: string }> {
  onProgress(0);

  try {
    const stepCount = 7;

    for (let step = 1; step <= stepCount; step += 1) {
      await sleep(180 + Math.floor(Math.random() * 140), signal);
      onProgress(Math.min(100, Math.round((step / stepCount) * 100)));
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`Upload failed before ${file.name} could finish.`);
  }

  if (Math.random() < 0.2) {
    throw new Error(`Could not upload ${file.name}. Please try again.`);
  }

  return {
    url: `https://mock.media/uploads/${encodeURIComponent(file.name)}-${Date.now()}`
  };
}
