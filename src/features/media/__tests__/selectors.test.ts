import { describe, expect, it } from 'vitest';

import type { RootState } from '../../../app/store';
import { mediaAdapter } from '../mediaSlice';
import {
  selectCanLoadNextPage,
  selectGalleryViewModel,
  selectVisibleMedia
} from '../selectors';
import type { MediaEntity } from '../types';

function createMediaItem(
  item: Partial<MediaEntity> & Pick<MediaEntity, 'id' | 'name' | 'type'>
): MediaEntity {
  return {
    size: 120_000,
    createdAt: '2026-03-20T12:00:00.000Z',
    source: 'seeded',
    previewStatus: { status: 'ready' },
    previewUrl: 'data:image/svg+xml,placeholder',
    previewKind: 'poster',
    uploadState: { status: 'idle' },
    errorMessage: null,
    ...item
  };
}

function buildState(
  items: MediaEntity[],
  overrides?: Partial<RootState>
): RootState {
  const mediaState = mediaAdapter.getInitialState({
    nextPage: 2,
    hasMore: true,
    total: items.length,
    loadedPages: [1],
    fetchState: { status: 'success' as const }
  });

  const populatedMediaState = mediaAdapter.setAll(mediaState, items);

  const baseState: RootState = {
    media: populatedMediaState,
    controls: {
      typeFilter: 'all',
      sortBy: 'date',
      searchInput: '',
      searchQuery: ''
    },
    uploads: {
      validationIssues: []
    }
  };

  return {
    ...baseState,
    media: {
      ...baseState.media,
      ...(overrides?.media ?? {})
    },
    controls: {
      ...baseState.controls,
      ...(overrides?.controls ?? {})
    },
    uploads: {
      ...baseState.uploads,
      ...(overrides?.uploads ?? {})
    }
  };
}

describe('media selectors', () => {
  const items = [
    createMediaItem({
      id: 'doc-1',
      name: 'Approval sheet.pdf',
      type: 'document',
      size: 80_000,
      createdAt: '2026-03-18T10:00:00.000Z'
    }),
    createMediaItem({
      id: 'img-1',
      name: 'Atrium frame 1.webp',
      type: 'image',
      size: 420_000,
      createdAt: '2026-03-19T10:00:00.000Z'
    }),
    createMediaItem({
      id: 'img-2',
      name: 'Atrium frame 2.png',
      type: 'image',
      size: 610_000,
      createdAt: '2026-03-20T10:00:00.000Z'
    })
  ];

  it('filters and sorts loaded items through selectors', () => {
    const state = buildState(items, {
      controls: {
        typeFilter: 'image',
        sortBy: 'size',
        searchInput: 'atrium',
        searchQuery: 'atrium'
      }
    });

    expect(selectVisibleMedia(state).map((item) => item.id)).toEqual([
      'img-2',
      'img-1'
    ]);
  });

  it('prevents duplicate page loads when the current page is already loading', () => {
    const state = buildState(items, {
      media: {
        ...buildState(items).media,
        fetchState: { status: 'loading', page: 2 }
      }
    });

    expect(selectCanLoadNextPage(state)).toBe(false);
  });

  it('returns a filtered empty state message when nothing matches', () => {
    const state = buildState(items, {
      controls: {
        typeFilter: 'image',
        sortBy: 'date',
        searchInput: 'missing',
        searchQuery: 'missing'
      }
    });

    const viewModel = selectGalleryViewModel(state);

    expect(viewModel.showEmpty).toBe(true);
    expect(viewModel.emptyMessage).toContain('No files match');
  });
});
