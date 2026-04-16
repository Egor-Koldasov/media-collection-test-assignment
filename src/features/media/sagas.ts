import type { PayloadAction } from '@reduxjs/toolkit';
import {
  END,
  eventChannel,
  type EventChannel,
  type SagaIterator,
  type Task
} from 'redux-saga';
import {
  all,
  call,
  cancel,
  cancelled,
  delay,
  fork,
  put,
  select,
  take,
  takeEvery,
  takeLatest,
  takeLeading
} from 'redux-saga/effects';

import { fetchMediaPage, uploadFile } from '../../services/mediaApi';
import {
  createPreviewCacheKey,
  getThumbnailBlob,
  setThumbnailBlob
} from '../../services/thumbnailCache';
import { generateThumbnailBlob } from '../../services/thumbnailGenerator';
import { isAbortError, toErrorMessage } from '../../utils/errors';
import { controlsActions } from './controlsSlice';
import { validateSelectedFiles } from './fileValidation';
import { createOptimisticMediaEntity, toSeededMediaEntity } from './mediaFactories';
import {
  cancelUploadRequested,
  filesSelected,
  mediaActions,
  removeMediaRequested,
  requestNextPage,
  retryUploadRequested
} from './mediaSlice';
import {
  clearRuntimeEntry,
  getRuntimeEntry,
  markRuntimeRemoved,
  patchRuntimeEntry,
  registerRuntimeEntry,
  revokeSourceObjectUrl
} from './registry';
import {
  selectCanLoadNextPage,
  selectMediaById,
  selectNextPageToLoad
} from './selectors';
import { uploadsActions } from './uploadsSlice';
import type { MediaEntity, PaginatedMediaResponse } from './types';

type UploadChannelEvent =
  | { type: 'progress'; progress: number }
  | { type: 'success' }
  | { type: 'error'; error: unknown };

function createUploadId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createUploadChannel(
  file: File,
  signal: AbortSignal
): EventChannel<UploadChannelEvent> {
  return eventChannel<UploadChannelEvent>((emit) => {
    uploadFile(file, (progress) => emit({ type: 'progress', progress }), signal)
      .then(() => {
        emit({ type: 'success' });
        emit(END);
      })
      .catch((error) => {
        emit({ type: 'error', error });
        emit(END);
      });

    return () => undefined;
  });
}

function* handleRequestNextPage(): SagaIterator {
  const canLoad: boolean = yield select(selectCanLoadNextPage);

  if (!canLoad) {
    return;
  }

  const page: number | null = yield select(selectNextPageToLoad);

  if (page === null) {
    return;
  }

  yield put(mediaActions.pageFetchStarted({ page }));

  try {
    const response: PaginatedMediaResponse = yield call(fetchMediaPage, page);
    const items = response.items.map(toSeededMediaEntity);

    yield put(
      mediaActions.pageFetchSucceeded({
        page,
        items,
        nextPage: response.nextPage,
        total: response.total
      })
    );
  } catch (error) {
    yield put(
      mediaActions.pageFetchFailed({
        page,
        message: toErrorMessage(
          error,
          'This section could not be loaded right now. Please retry.'
        )
      })
    );
  }
}

function* previewFlow(id: string): SagaIterator {
  const runtime = getRuntimeEntry(id);

  if (!runtime) {
    return;
  }

  const previewController = new AbortController();
  patchRuntimeEntry(id, { previewController });
  yield put(mediaActions.previewGenerationStarted({ id }));

  try {
    const cacheKey = createPreviewCacheKey(runtime.file);
    let previewBlob: Blob | null = null;

    try {
      previewBlob = yield call(getThumbnailBlob, cacheKey);
    } catch {
      previewBlob = null;
    }

    if (!previewBlob) {
      const generatedPreview: Blob = yield call(
        generateThumbnailBlob,
        runtime.file,
        previewController.signal,
        (sourceObjectUrl: string) => {
          patchRuntimeEntry(id, { sourceObjectUrl });
        }
      );
      previewBlob = generatedPreview;

      try {
        yield call(setThumbnailBlob, cacheKey, generatedPreview);
      } catch {
        // Caching is best-effort. A storage miss should not block the preview itself.
      }
    }

    if (previewController.signal.aborted) {
      throw new DOMException('Thumbnail generation was aborted.', 'AbortError');
    }

    if (!previewBlob) {
      throw new Error('Preview unavailable.');
    }

    const previewUrl = URL.createObjectURL(previewBlob);
    const currentItem: MediaEntity | null = yield select(selectMediaById, id);
    const currentRuntime = getRuntimeEntry(id);

    if (!currentItem || !currentRuntime || currentRuntime.removed) {
      URL.revokeObjectURL(previewUrl);
      return;
    }

    yield put(
      mediaActions.previewReady({
        id,
        previewUrl,
        previewKind: 'generated'
      })
    );
  } catch (error) {
    if (!isAbortError(error)) {
      yield put(
        mediaActions.previewFailed({
          id,
          message: toErrorMessage(error, 'Preview unavailable.')
        })
      );
    }
  } finally {
    if (yield cancelled()) {
      previewController.abort();
    }

    patchRuntimeEntry(id, {
      previewController: undefined,
      previewTask: undefined
    });
    revokeSourceObjectUrl(id);
  }
}

function* uploadFlow(id: string): SagaIterator {
  const runtime = getRuntimeEntry(id);

  if (!runtime) {
    return;
  }

  const uploadController = new AbortController();
  const uploadChannel: EventChannel<UploadChannelEvent> = yield call(
    createUploadChannel,
    runtime.file,
    uploadController.signal
  );

  patchRuntimeEntry(id, { uploadController });
  yield put(mediaActions.uploadRetryStarted({ id }));

  try {
    while (true) {
      const event: UploadChannelEvent = yield take(uploadChannel);

      if (event.type === 'progress') {
        yield put(
          mediaActions.uploadProgressUpdated({
            id,
            progress: event.progress
          })
        );
        continue;
      }

      if (event.type === 'success') {
        yield put(mediaActions.uploadSucceeded({ id }));
        break;
      }

      yield put(
        mediaActions.uploadFailed({
          id,
          message: isAbortError(event.error)
            ? 'Upload cancelled.'
            : toErrorMessage(
                event.error,
                `Could not upload ${runtime.file.name}. Please try again.`
              )
        })
      );
      break;
    }
  } finally {
    if (yield cancelled()) {
      uploadController.abort();
    }

    uploadChannel.close();
    patchRuntimeEntry(id, {
      uploadController: undefined,
      uploadTask: undefined
    });
  }
}

function* handleFilesSelected(action: PayloadAction<File[]>): SagaIterator {
  const { validFiles, issues } = validateSelectedFiles(action.payload);
  yield put(uploadsActions.setValidationIssues(issues));

  for (const validFile of validFiles) {
    const id = createUploadId();
    const item = createOptimisticMediaEntity(id, validFile.file, validFile.mediaType);
    registerRuntimeEntry(id, validFile.file);
    yield put(mediaActions.uploadQueued({ item }));

    const uploadTask: Task = yield fork(uploadFlow, id);
    let previewTask: Task | undefined;

    if (validFile.mediaType !== 'document') {
      previewTask = yield fork(previewFlow, id);
    }

    patchRuntimeEntry(id, {
      previewTask,
      uploadTask
    });
  }
}

function* handleRetryUpload(action: PayloadAction<string>): SagaIterator {
  const id = action.payload;
  const runtime = getRuntimeEntry(id);
  const item: MediaEntity | null = yield select(selectMediaById, id);

  if (!runtime || !item) {
    return;
  }

  if (runtime.uploadTask?.isRunning()) {
    return;
  }

  const uploadTask: Task = yield fork(uploadFlow, id);
  patchRuntimeEntry(id, { uploadTask, removed: false });
}

function* handleCancelUpload(action: PayloadAction<string>): SagaIterator {
  const runtime = getRuntimeEntry(action.payload);
  runtime?.uploadController?.abort();
}

function* handleRemoveMedia(action: PayloadAction<string>): SagaIterator {
  const id = action.payload;
  const item: MediaEntity | null = yield select(selectMediaById, id);
  const runtime = getRuntimeEntry(id);

  markRuntimeRemoved(id);
  runtime?.uploadController?.abort();
  runtime?.previewController?.abort();

  if (runtime?.uploadTask) {
    yield cancel(runtime.uploadTask);
  }

  if (runtime?.previewTask) {
    yield cancel(runtime.previewTask);
  }

  yield put(mediaActions.mediaRemoved({ id }));

  if (item?.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl);
  }

  revokeSourceObjectUrl(id);
  clearRuntimeEntry(id);
}

function* handleSearchInputChanged(
  action: PayloadAction<string>
): SagaIterator {
  yield delay(300);
  yield put(controlsActions.searchQueryCommitted(action.payload));
}

export function* mediaSaga(): SagaIterator {
  yield all([
    takeLeading(requestNextPage.type, handleRequestNextPage),
    takeEvery(filesSelected.type, handleFilesSelected),
    takeEvery(retryUploadRequested.type, handleRetryUpload),
    takeEvery(cancelUploadRequested.type, handleCancelUpload),
    takeEvery(removeMediaRequested.type, handleRemoveMedia),
    takeLatest(controlsActions.searchInputChanged.type, handleSearchInputChanged)
  ]);
}
