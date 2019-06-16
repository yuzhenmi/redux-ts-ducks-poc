import { Dispatch, GetState, ExtraArguments } from './types';
import CollectionDuck, { CollectionState } from './abstract/CollectionDuck';
import { callAction } from './api';

interface Data {
  id: string;
  title: string;
  coverImage: string;
}

export interface MyResourcesState extends CollectionState<Data> {}

class MyResourcesDuck extends CollectionDuck<Data> {

  async load(dispatch: Dispatch, getState: GetState, extraArguments: ExtraArguments): Promise<Data[]> {
    const { myResources } = await dispatch(callAction('loadMyResources'));
    return myResources ;
  }
}

const duck = new MyResourcesDuck('myResources');
export const loadMyResourcesAction = duck.loadAction;
export default duck.getReducer();
