import type { PaginatedMediaResponse } from '../features/media/types';
import { isAbortError } from '../utils/errors';

async function parseErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown };

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Fall back to the provided message when the error response is not JSON.
  }

  return fallback;
}

export async function fetchMediaPage(
  page: number
): Promise<PaginatedMediaResponse> {
  const response = await fetch(`/api/media?page=${page}`);

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
        'This section could not be loaded right now. Please retry.'
      )
    );
  }

  return (await response.json()) as PaginatedMediaResponse;
}

export async function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<{ url: string }> {
  onProgress(0);

  const formData = new FormData();
  let progress = 0;
  const progressTimer = window.setInterval(() => {
    if (progress >= 95) {
      return;
    }

    progress = Math.min(95, progress + 14);
    onProgress(progress);
  }, 180 + Math.floor(Math.random() * 140));

  formData.append('file', file);

  try {
    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
      signal
    });

    if (!response.ok) {
      throw new Error(
        await parseErrorMessage(response, `Could not upload ${file.name}. Please try again.`)
      );
    }

    const payload = (await response.json()) as { url?: unknown };

    if (typeof payload.url !== 'string' || payload.url.length === 0) {
      throw new Error('Upload response was invalid.');
    }

    onProgress(100);
    return { url: payload.url };
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Could not upload ${file.name}. Please try again.`);
  } finally {
    window.clearInterval(progressTimer);
  }
}
