import { PREVIEW_SIZE } from '../features/media/constants';
import { isAbortError } from '../utils/errors';

function createAbortError(): DOMException {
  return new DOMException('Thumbnail generation was aborted.', 'AbortError');
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw createAbortError();
  }
}

function createCanvasContext(): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_SIZE;
  canvas.height = PREVIEW_SIZE;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not available in this browser.');
  }

  return { canvas, context };
}

function cleanupCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number
): void {
  const targetRatio = 1;
  const sourceRatio = width / height;

  let sourceWidth = width;
  let sourceHeight = height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = height * targetRatio;
    sourceX = (width - sourceWidth) / 2;
  } else if (sourceRatio < targetRatio) {
    sourceHeight = width / targetRatio;
    sourceY = (height - sourceHeight) / 2;
  }

  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    PREVIEW_SIZE,
    PREVIEW_SIZE
  );
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not create the thumbnail preview.'));
          return;
        }

        resolve(blob);
      },
      'image/webp',
      0.92
    );
  });
}

async function generateImageThumbnail(
  file: File,
  signal: AbortSignal
): Promise<Blob> {
  assertNotAborted(signal);
  const { canvas, context } = createCanvasContext();

  try {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);

      try {
        assertNotAborted(signal);
        drawCover(context, bitmap, bitmap.width, bitmap.height);
        return await canvasToBlob(canvas);
      } finally {
        bitmap.close();
      }
    }

    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();

    try {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          image.onload = null;
          image.onerror = null;
          signal.removeEventListener('abort', onAbort);
        };

        const onAbort = () => {
          cleanup();
          reject(createAbortError());
        };

        signal.addEventListener('abort', onAbort, { once: true });
        image.onload = () => {
          cleanup();
          resolve();
        };
        image.onerror = () => {
          cleanup();
          reject(new Error('Could not load the image preview.'));
        };

        image.src = sourceUrl;
      });

      assertNotAborted(signal);
      drawCover(context, image, image.naturalWidth, image.naturalHeight);
      return await canvasToBlob(canvas);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  } finally {
    cleanupCanvas(canvas);
  }
}

async function generateVideoThumbnail(
  file: File,
  signal: AbortSignal,
  onSourceObjectUrl: (objectUrl: string) => void
): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(file);
  onSourceObjectUrl(sourceUrl);

  const { canvas, context } = createCanvasContext();
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.onloadeddata = null;
        video.onerror = null;
        signal.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        cleanup();
        reject(createAbortError());
      };

      signal.addEventListener('abort', onAbort, { once: true });
      video.onloadeddata = () => {
        cleanup();
        resolve();
      };
      video.onerror = () => {
        cleanup();
        reject(new Error('Could not read the first video frame.'));
      };

      video.src = sourceUrl;
      video.load();
    });

    assertNotAborted(signal);

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('The selected video does not contain a readable frame.');
    }

    drawCover(context, video, video.videoWidth, video.videoHeight);
    return await canvasToBlob(canvas);
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    cleanupCanvas(canvas);
  }
}

export async function generateThumbnailBlob(
  file: File,
  signal: AbortSignal,
  onSourceObjectUrl: (objectUrl: string) => void
): Promise<Blob> {
  try {
    if (file.type.startsWith('video/')) {
      return await generateVideoThumbnail(file, signal, onSourceObjectUrl);
    }

    return await generateImageThumbnail(file, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error('Preview could not be generated for this file.');
  }
}
