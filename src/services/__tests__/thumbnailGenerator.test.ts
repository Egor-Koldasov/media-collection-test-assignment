import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateThumbnailBlob } from '../thumbnailGenerator';

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1200;
  naturalHeight = 900;
  decoding = 'auto';

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

describe('thumbnailGenerator', () => {
  const originalImage = globalThis.Image;
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.Image = originalImage;
    globalThis.createImageBitmap = originalCreateImageBitmap;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('falls back to image loading when bitmap decoding rejects', async () => {
    const drawImage = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: (callback: (blob: Blob | null) => void) => {
        callback(new Blob(['preview'], { type: 'image/png' }));
      }
    } as unknown as HTMLCanvasElement;

    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation(
      ((tagName: string) => {
        if (tagName === 'canvas') {
          return fakeCanvas;
        }

        return originalCreateElement(tagName);
      }) as typeof document.createElement
    );

    globalThis.Image = MockImage as unknown as typeof Image;
    globalThis.createImageBitmap = vi
      .fn()
      .mockRejectedValue(new Error('Bitmap decode failed'));
    URL.createObjectURL = vi.fn(() => 'blob:source');
    URL.revokeObjectURL = vi.fn();

    const blob = await generateThumbnailBlob(
      new File(['image-bytes'], 'photo.jpg', { type: 'image/jpeg' }),
      new AbortController().signal,
      vi.fn()
    );

    expect(blob.type).toBe('image/png');
    expect(globalThis.createImageBitmap).toHaveBeenCalledOnce();
    expect(drawImage).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source');
  });
});
