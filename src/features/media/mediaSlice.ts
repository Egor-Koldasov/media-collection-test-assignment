import {
  createAction,
  createEntityAdapter,
  createSlice,
  type PayloadAction
} from '@reduxjs/toolkit';

import type { FetchState, MediaEntity, PreviewKind } from './types';

interface MediaExtraState {
  nextPage: number | null;
  hasMore: boolean;
  total: number;
  loadedPages: number[];
  fetchState: FetchState;
}

export const mediaAdapter = createEntityAdapter<MediaEntity>();

const initialState = mediaAdapter.getInitialState<MediaExtraState>({
  nextPage: 1,
  hasMore: true,
  total: 0,
  loadedPages: [],
  fetchState: { status: 'idle' }
});

export type MediaState = typeof initialState;

export const requestNextPage = createAction('media/requestNextPage');
export const filesSelected = createAction<File[]>('media/filesSelected');
export const retryUploadRequested = createAction<string>('media/retryUploadRequested');
export const cancelUploadRequested = createAction<string>('media/cancelUploadRequested');
export const removeMediaRequested = createAction<string>('media/removeMediaRequested');

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    pageFetchStarted(state, action: PayloadAction<{ page: number }>) {
      state.fetchState = {
        status: 'loading',
        page: action.payload.page
      };
    },
    pageFetchSucceeded(
      state,
      action: PayloadAction<{
        page: number;
        items: MediaEntity[];
        nextPage: number | null;
        total: number;
      }>
    ) {
      mediaAdapter.upsertMany(state, action.payload.items);
      state.nextPage = action.payload.nextPage;
      state.hasMore = action.payload.nextPage !== null;
      state.total = action.payload.total;

      if (!state.loadedPages.includes(action.payload.page)) {
        state.loadedPages.push(action.payload.page);
        state.loadedPages.sort((left: number, right: number) => left - right);
      }

      state.fetchState = { status: 'success' };
    },
    pageFetchFailed(
      state,
      action: PayloadAction<{ page: number; message: string }>
    ) {
      state.fetchState = {
        status: 'error',
        page: action.payload.page,
        message: action.payload.message
      };
    },
    uploadQueued(state, action: PayloadAction<{ item: MediaEntity }>) {
      mediaAdapter.addOne(state, action.payload.item);
    },
    mediaRemoved(state, action: PayloadAction<{ id: string }>) {
      mediaAdapter.removeOne(state, action.payload.id);
    },
    previewGenerationStarted(state, action: PayloadAction<{ id: string }>) {
      const entity = state.entities[action.payload.id];

      if (!entity) {
        return;
      }

      entity.previewStatus = { status: 'loading' };
    },
    previewReady(
      state,
      action: PayloadAction<{
        id: string;
        previewUrl: string;
        previewKind: PreviewKind;
      }>
    ) {
      const entity = state.entities[action.payload.id];

      if (!entity) {
        return;
      }

      entity.previewStatus = { status: 'ready' };
      entity.previewUrl = action.payload.previewUrl;
      entity.previewKind = action.payload.previewKind;
    },
    previewFailed(
      state,
      action: PayloadAction<{ id: string; message: string }>
    ) {
      const entity = state.entities[action.payload.id];

      if (!entity) {
        return;
      }

      entity.previewStatus = {
        status: 'error',
        message: action.payload.message
      };
    },
    uploadRetryStarted(state, action: PayloadAction<{ id: string }>) {
      const entity = state.entities[action.payload.id];

      if (!entity) {
        return;
      }

      entity.uploadState = {
        status: 'uploading',
        progress: 0
      };
      entity.errorMessage = null;
    },
    uploadProgressUpdated(
      state,
      action: PayloadAction<{ id: string; progress: number }>
    ) {
      const entity = state.entities[action.payload.id];

      if (!entity) {
        return;
      }

      entity.uploadState = {
        status: 'uploading',
        progress: action.payload.progress
      };
      entity.errorMessage = null;
    },
    uploadSucceeded(state, action: PayloadAction<{ id: string }>) {
      const entity = state.entities[action.payload.id];

      if (!entity) {
        return;
      }

      entity.uploadState = { status: 'done' };
      entity.errorMessage = null;
    },
    uploadFailed(
      state,
      action: PayloadAction<{ id: string; message: string }>
    ) {
      const entity = state.entities[action.payload.id];

      if (!entity) {
        return;
      }

      entity.uploadState = {
        status: 'error',
        message: action.payload.message
      };
      entity.errorMessage = action.payload.message;
    }
  }
});

export const mediaActions = mediaSlice.actions;
export const mediaReducer = mediaSlice.reducer;
