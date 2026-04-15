import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { SortBy, TypeFilter } from './types';

interface ControlsState {
  typeFilter: TypeFilter;
  sortBy: SortBy;
  searchInput: string;
  searchQuery: string;
}

const initialState: ControlsState = {
  typeFilter: 'all',
  sortBy: 'date',
  searchInput: '',
  searchQuery: ''
};

const controlsSlice = createSlice({
  name: 'controls',
  initialState,
  reducers: {
    setTypeFilter(state, action: PayloadAction<TypeFilter>) {
      state.typeFilter = action.payload;
    },
    setSortBy(state, action: PayloadAction<SortBy>) {
      state.sortBy = action.payload;
    },
    searchInputChanged(state, action: PayloadAction<string>) {
      state.searchInput = action.payload;
    },
    searchQueryCommitted(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload.trim().toLowerCase();
    }
  }
});

export const controlsActions = controlsSlice.actions;
export const controlsReducer = controlsSlice.reducer;
