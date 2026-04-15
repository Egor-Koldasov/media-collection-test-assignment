import type { MediaType } from '../features/media/types';

const documentScene = new URL('./mock-thumbnails/document-scene.svg', import.meta.url).href;
const catThumbnails = [
  new URL('./cat-thumbnails/cat-01.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-02.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-03.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-04.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-05.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-06.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-07.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-08.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-09.jpg', import.meta.url).href,
  new URL('./cat-thumbnails/cat-10.jpg', import.meta.url).href
] as const;

export function getDocumentIllustration(): string {
  return documentScene;
}

export function getRandomCatThumbnail(): string {
  const randomIndex = Math.floor(Math.random() * catThumbnails.length);
  return catThumbnails[randomIndex];
}

export function getMockThumbnailForType(type: MediaType): string {
  if (type === 'document') {
    return getDocumentIllustration();
  }

  return getRandomCatThumbnail();
}
