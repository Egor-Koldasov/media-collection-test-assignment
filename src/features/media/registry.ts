import type { Task } from 'redux-saga';

interface RuntimeEntry {
  file: File;
  uploadController?: AbortController;
  previewController?: AbortController;
  uploadTask?: Task;
  previewTask?: Task;
  sourceObjectUrl?: string;
  removed: boolean;
}

const runtimeRegistry = new Map<string, RuntimeEntry>();

export function registerRuntimeEntry(id: string, file: File): RuntimeEntry {
  const entry: RuntimeEntry = {
    file,
    removed: false
  };

  runtimeRegistry.set(id, entry);

  return entry;
}

export function getRuntimeEntry(id: string): RuntimeEntry | undefined {
  return runtimeRegistry.get(id);
}

export function patchRuntimeEntry(
  id: string,
  patch: Partial<RuntimeEntry>
): RuntimeEntry | undefined {
  const entry = runtimeRegistry.get(id);

  if (!entry) {
    return undefined;
  }

  Object.assign(entry, patch);

  return entry;
}

export function markRuntimeRemoved(id: string): void {
  const entry = runtimeRegistry.get(id);

  if (entry) {
    entry.removed = true;
  }
}

export function revokeSourceObjectUrl(id: string): void {
  const entry = runtimeRegistry.get(id);

  if (!entry?.sourceObjectUrl) {
    return;
  }

  URL.revokeObjectURL(entry.sourceObjectUrl);
  entry.sourceObjectUrl = undefined;
}

export function clearRuntimeEntry(id: string): void {
  runtimeRegistry.delete(id);
}
