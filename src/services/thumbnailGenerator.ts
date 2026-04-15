import { PREVIEW_SIZE } from '../features/media/constants';
import { isAbortError } from '../utils/errors';

const MAX_PREVIEW_SCALE = 2;

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
  const outputSize = getPreviewOutputSize();
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not available in this browser.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  return { canvas, context };
}

export function getPreviewScale(): number {
  const deviceScale =
    typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : 1;

  return Math.max(1, Math.min(MAX_PREVIEW_SCALE, Math.ceil(deviceScale)));
}

export function getPreviewOutputSize(): number {
  return PREVIEW_SIZE * getPreviewScale();
}

function cleanupCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  outputSize: number
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
    outputSize,
    outputSize
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
      'image/png'
    );
  });
}

async function loadImageFromFile(
  file: File,
  signal: AbortSignal
): Promise<{
  image: HTMLImageElement;
  sourceUrl: string;
}> {
  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';

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

  return { image, sourceUrl };
}

async function generateImageThumbnail(
  file: File,
  signal: AbortSignal
): Promise<Blob> {
  assertNotAborted(signal);
  const { canvas, context } = createCanvasContext();

  try {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);

        try {
          assertNotAborted(signal);
          drawCover(context, bitmap, bitmap.width, bitmap.height, canvas.width);
          return await canvasToBlob(canvas);
        } finally {
          bitmap.close();
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
      }
    }

    const { image, sourceUrl } = await loadImageFromFile(file, signal);

    try {
      assertNotAborted(signal);

      if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error('Could not read the uploaded image dimensions.');
      }

      drawCover(
        context,
        image,
        image.naturalWidth,
        image.naturalHeight,
        canvas.width
      );
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

    drawCover(
      context,
      video,
      video.videoWidth,
      video.videoHeight,
      canvas.width
    );
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
