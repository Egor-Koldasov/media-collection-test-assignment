import { all } from 'redux-saga/effects';

import { mediaSaga } from '../features/media/sagas';

export function* rootSaga() {
  yield all([mediaSaga()]);
}
