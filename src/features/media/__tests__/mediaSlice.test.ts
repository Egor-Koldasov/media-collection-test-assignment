import { describe, expect, it } from 'vitest';

import { createOptimisticMediaEntity } from '../mediaFactories';
import { mediaActions, mediaReducer } from '../mediaSlice';
import type { MediaEntity } from '../types';

function createSeededItem(id: string): MediaEntity {
  return {
    id,
    name: `Item ${id}.pdf`,
    type: 'document',
    size: 100_000,
    createdAt: '2026-03-20T12:00:00.000Z',
    source: 'seeded',
    previewStatus: { status: 'ready' },
    previewUrl: 'data:image/svg+xml,poster',
    previewKind: 'poster',
    uploadState: { status: 'idle' },
    errorMessage: null
  };
}

describe('media slice', () => {
  it('stores fetched pages and updates pagination state', () => {
    const nextState = mediaReducer(
      undefined,
      mediaActions.pageFetchSucceeded({
        page: 1,
        items: [createSeededItem('seed-1'), createSeededItem('seed-2')],
        nextPage: 2,
        total: 60
      })
    );

    expect(nextState.ids).toHaveLength(2);
    expect(nextState.loadedPages).toEqual([1]);
    expect(nextState.nextPage).toBe(2);
    expect(nextState.fetchState).toEqual({ status: 'success' });
  });

  it('adds and removes optimistic uploads immediately', () => {
    const optimisticItem = createOptimisticMediaEntity(
      'upload-1',
      new File(['hello'], 'hello.png', { type: 'image/png' }),
      'image'
    );

    const addedState = mediaReducer(
      undefined,
      mediaActions.uploadQueued({ item: optimisticItem })
    );
    const removedState = mediaReducer(
      addedState,
      mediaActions.mediaRemoved({ id: optimisticItem.id })
    );

    expect(addedState.ids).toContain('upload-1');
    expect(removedState.ids).not.toContain('upload-1');
  });

  it('tracks upload failure details on the matching entity', () => {
    const optimisticItem = createOptimisticMediaEntity(
      'upload-2',
      new File(['hello'], 'hello.png', { type: 'image/png' }),
      'image'
    );

    const addedState = mediaReducer(
      undefined,
      mediaActions.uploadQueued({ item: optimisticItem })
    );
    const failedState = mediaReducer(
      addedState,
      mediaActions.uploadFailed({
        id: optimisticItem.id,
        message: 'Upload cancelled.'
      })
    );

    expect(failedState.entities['upload-2']?.uploadState).toEqual({
      status: 'error',
      message: 'Upload cancelled.'
    });
    expect(failedState.entities['upload-2']?.errorMessage).toBe('Upload cancelled.');
  });

  it('creates uploaded documents with a ready poster preview', () => {
    const optimisticItem = createOptimisticMediaEntity(
      'upload-3',
      new File(['document'], 'brief.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }),
      'document'
    );

    expect(optimisticItem.type).toBe('document');
    expect(optimisticItem.previewStatus).toEqual({ status: 'ready' });
    expect(optimisticItem.previewKind).toBe('poster');
  });
});
