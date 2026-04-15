import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';

import { controlsReducer } from '../features/media/controlsSlice';
import { filesSelected, mediaReducer } from '../features/media/mediaSlice';
import { uploadsReducer } from '../features/media/uploadsSlice';
import { rootSaga } from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    media: mediaReducer,
    controls: controlsReducer,
    uploads: uploadsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [filesSelected.type]
      }
    }).concat(sagaMiddleware)
});

sagaMiddleware.run(rootSaga);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
