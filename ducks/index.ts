import { combineReducers } from 'redux';

import myResourcesReducer, { MyResourcesState } from './myResources';

export interface RootState {
  myResources: MyResourcesState;
}

export default combineReducers({
  myResources: myResourcesReducer,
});
