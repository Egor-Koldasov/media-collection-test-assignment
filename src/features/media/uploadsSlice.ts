import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { UploadValidationIssue } from './types';

interface UploadsState {
  validationIssues: UploadValidationIssue[];
}

const initialState: UploadsState = {
  validationIssues: []
};

const uploadsSlice = createSlice({
  name: 'uploads',
  initialState,
  reducers: {
    setValidationIssues(state, action: PayloadAction<UploadValidationIssue[]>) {
      state.validationIssues = action.payload;
    },
    clearValidationIssues(state) {
      state.validationIssues = [];
    }
  }
});

export const uploadsActions = uploadsSlice.actions;
export const uploadsReducer = uploadsSlice.reducer;
