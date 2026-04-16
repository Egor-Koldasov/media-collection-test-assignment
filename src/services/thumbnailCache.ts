const DB_NAME = 'media-preview-cache';
const STORE_NAME = 'thumbnails';
const DB_VERSION = 1;

let databasePromise: Promise<IDBDatabase> | null = null;

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (!('indexedDB' in globalThis)) {
    return null;
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Could not open the preview cache.'));
    });
  }

  return databasePromise;
}

export function createPreviewCacheKey(file: Pick<File, 'name' | 'size'>): string {
  return `${file.name}:${file.size}`;
}

export async function getThumbnailBlob(key: string): Promise<Blob | null> {
  const database = await openDatabase();

  if (!database) {
    return null;
  }

  const transaction = database.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const result = await wrapRequest<Blob | undefined>(store.get(key));
  await waitForTransaction(transaction);

  return result ?? null;
}

export async function setThumbnailBlob(key: string, blob: Blob): Promise<void> {
  const database = await openDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(blob, key);
  await waitForTransaction(transaction);
}

export async function clearThumbnailCache(): Promise<void> {
  const database = await openDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).clear();
  await waitForTransaction(transaction);
}
