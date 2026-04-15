export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  return 'name' in error && error.name === 'AbortError';
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
