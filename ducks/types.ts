import { ThunkDispatch } from 'redux-thunk';
import { Action as ReduxAction } from 'redux';
import { NextContext } from 'next';

import { RootState } from './index';
import { Store } from './createStore';

export interface Payload {}
export interface Action<P extends Payload = Payload> extends ReduxAction {
  payload: P;
}
export interface ExtraArguments {}
export type Dispatch = ThunkDispatch<RootState, ExtraArguments, Action>;
export type GetState = () => RootState;
export interface PageContext extends NextContext {
  store: Store;
}
export type ThunkAction<R = void> = (
  dispatch: ThunkDispatch<RootState, ExtraArguments, Action>,
  getState: () => RootState,
  extraArgument: ExtraArguments,
) => R;
