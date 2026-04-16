import { PAGE_SIZE } from '../features/media/constants';
import type {
  MediaItem,
  MediaType,
  PaginatedMediaResponse
} from '../features/media/types';
import { getMockPreviewUrlForType } from './mockThumbnails';

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
const totalFixtures = 60;

function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

export function randomLatency(): number {
  return 500 + Math.floor(Math.random() * 501);
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

  return new Date(
    now - index * hoursBetweenItems * 60 * 60 * 1000
  ).toISOString();
}

function createMediaItem(index: number): MediaItem {
  const type = (['image', 'video', 'document'] as const)[index % 3];
  const localIndex = Math.floor(index / 3);
  const previewUrl = getMockPreviewUrlForType(type);

  return {
    id: `seed-${padNumber(index + 1)}`,
    name: `${nameForType(type, localIndex)} ${padNumber(index + 1)}.${extensionForType(type, localIndex)}`,
    type,
    size: sizeForType(type, localIndex),
    createdAt: createdAtForIndex(index),
    previewUrl,
    previewKind: previewUrl ? 'poster' : undefined
  };
}

export const mediaFixtures = Array.from(
  { length: totalFixtures },
  (_, index) => createMediaItem(index)
);

export function createMediaPage(page: number): PaginatedMediaResponse {
  const startIndex = (page - 1) * PAGE_SIZE;
  const items = mediaFixtures.slice(startIndex, startIndex + PAGE_SIZE);

  return {
    items,
    nextPage: startIndex + PAGE_SIZE >= mediaFixtures.length ? null : page + 1,
    total: mediaFixtures.length
  };
}
