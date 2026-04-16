import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../app/store';
import { mediaAdapter } from './mediaSlice';

export const selectMediaState = (state: RootState) => state.media;
export const selectControlsState = (state: RootState) => state.controls;
export const selectUploadsState = (state: RootState) => state.uploads;

const mediaSelectors = mediaAdapter.getSelectors(selectMediaState);

export const selectAllMedia = mediaSelectors.selectAll;
export const selectMediaEntities = mediaSelectors.selectEntities;

export const selectMediaById = createSelector(
  [selectMediaEntities, (_state: RootState, id: string) => id],
  (entities, id) => entities[id] ?? null
);

export const selectTypeFilter = createSelector(
  [selectControlsState],
  (controls) => controls.typeFilter
);

export const selectSortBy = createSelector(
  [selectControlsState],
  (controls) => controls.sortBy
);

export const selectSearchInput = createSelector(
  [selectControlsState],
  (controls) => controls.searchInput
);

export const selectSearchQuery = createSelector(
  [selectControlsState],
  (controls) => controls.searchQuery
);

export const selectValidationIssues = createSelector(
  [selectUploadsState],
  (uploads) => uploads.validationIssues
);

export const selectCanLoadNextPage = createSelector(
  [selectMediaState],
  (mediaState) => {
    if (mediaState.nextPage === null || !mediaState.hasMore) {
      return false;
    }

    if (mediaState.fetchState.status === 'loading') {
      return false;
    }

    return !mediaState.loadedPages.includes(mediaState.nextPage);
  }
);

export const selectNextPageToLoad = createSelector(
  [selectMediaState],
  (mediaState) => mediaState.nextPage
);

export const selectVisibleMedia = createSelector(
  [selectAllMedia, selectTypeFilter, selectSortBy, selectSearchQuery],
  (mediaItems, typeFilter, sortBy, searchQuery) => {
    const filteredItems = mediaItems.filter((item) => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesSearch =
        searchQuery.length === 0 ||
        item.name.toLowerCase().includes(searchQuery);

      return matchesType && matchesSearch;
    });

    return [...filteredItems].sort((left, right) => {
      if (sortBy === 'size') {
        return right.size - left.size;
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }
);

export const selectActiveUploadsCount = createSelector(
  [selectAllMedia],
  (mediaItems) =>
    mediaItems.filter((item) => item.uploadState.status === 'uploading').length
);

export const selectGalleryViewModel = createSelector(
  [selectAllMedia, selectVisibleMedia, selectMediaState, selectControlsState],
  (allItems, visibleItems, mediaState, controls) => {
    const isInitialLoading =
      allItems.length === 0 && mediaState.fetchState.status === 'loading';
    const isPageLoading =
      allItems.length > 0 && mediaState.fetchState.status === 'loading';
    const fetchError =
      mediaState.fetchState.status === 'error'
        ? mediaState.fetchState.message
        : null;
    const hasActiveFilters =
      controls.typeFilter !== 'all' || controls.searchQuery.length > 0;
    const showEmpty =
      !isInitialLoading && visibleItems.length === 0 && fetchError === null;
    // TODO: It might be better to move this into the React component.
    const emptyMessage =
      allItems.length === 0
        ? 'Add your first file to start the collection.'
        : hasActiveFilters
          ? 'No files match the current search.'
          : 'No items are available right now.';

    return {
      items: visibleItems,
      isInitialLoading,
      isPageLoading,
      fetchError,
      showEmpty,
      emptyMessage,
      hasMore: mediaState.hasMore,
      showEndOfList:
        !mediaState.hasMore &&
        visibleItems.length > 0 &&
        mediaState.fetchState.status !== 'loading'
    };
  }
);
