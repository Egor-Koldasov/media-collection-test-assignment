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

class MockVideo {
  onloadedmetadata: (() => void) | null = null;
  onloadeddata: (() => void) | null = null;
  onseeked: (() => void) | null = null;
  oncanplay: (() => void) | null = null;
  onerror: (() => void) | null = null;
  muted = false;
  playsInline = false;
  preload = 'metadata';
  videoWidth = 1920;
  videoHeight = 1080;
  duration = 4;
  readyState = 0;
  private currentTimeValue = 0;

  get currentTime(): number {
    return this.currentTimeValue;
  }

  set currentTime(value: number) {
    this.currentTimeValue = value;
    this.readyState = 2;

    queueMicrotask(() => {
      this.onseeked?.();
    });
  }

  load(): void {
    queueMicrotask(() => {
      this.readyState = 1;
      this.onloadedmetadata?.();
    });
  }

  pause(): void {}

  removeAttribute(_name: string): void {}

  set src(_value: string) {}
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

  it('seeks to a drawable frame before capturing a video thumbnail', async () => {
    const drawImage = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: (callback: (blob: Blob | null) => void) => {
        callback(new Blob(['preview'], { type: 'image/png' }));
      }
    } as unknown as HTMLCanvasElement;
    const fakeVideo = new MockVideo() as unknown as HTMLVideoElement;
    const originalCreateElement = document.createElement.bind(document);
    const onSourceObjectUrl = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation(
      ((tagName: string) => {
        if (tagName === 'canvas') {
          return fakeCanvas;
        }

        if (tagName === 'video') {
          return fakeVideo;
        }

        return originalCreateElement(tagName);
      }) as typeof document.createElement
    );

    URL.createObjectURL = vi.fn(() => 'blob:video-source');

    const blob = await generateThumbnailBlob(
      new File(['video-bytes'], 'clip.mp4', { type: 'video/mp4' }),
      new AbortController().signal,
      onSourceObjectUrl
    );

    expect(blob.type).toBe('image/png');
    expect(onSourceObjectUrl).toHaveBeenCalledWith('blob:video-source');
    expect(fakeVideo.preload).toBe('auto');
    expect(fakeVideo.currentTime).toBeCloseTo(0.1, 5);
    expect(drawImage).toHaveBeenCalledOnce();
  });
});
