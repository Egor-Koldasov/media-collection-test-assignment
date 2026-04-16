import type { MediaType } from '../features/media/types';

const catThumbnails = [
  new URL('./assets/cat-thumbnails/cat-01.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-02.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-03.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-04.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-05.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-06.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-07.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-08.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-09.jpg', import.meta.url).href,
  new URL('./assets/cat-thumbnails/cat-10.jpg', import.meta.url).href
] as const;

export function getRandomMockThumbnail(): string {
  const randomIndex = Math.floor(Math.random() * catThumbnails.length);
  return catThumbnails[randomIndex];
}

export function getMockPreviewUrlForType(type: MediaType): string | null {
  if (type === 'image' || type === 'video') {
    return getRandomMockThumbnail();
  }

  return null;
}
