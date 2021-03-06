import generateRandomKey from '../../utils/generateRandomKey';
import ScopedDuck, { ScopedState } from './ScopedDuck';
import { Action, Payload, ThunkAction, Dispatch, GetState, ExtraArguments } from '../types';

export interface ScopedCollectionScopedState<D> {
  loadKey: string | null;
  isLoading: boolean;
  isLoaded: boolean;
  loadError: Error | null;
  data: D[] | null;
}

export type ScopedCollectionState<D> = ScopedState<ScopedCollectionScopedState<D>>;

export interface LoadRequestedPayload<S> extends Payload {
  scope: S;
  loadKey: string;
}

export interface LoadSucceededPayload<S, D> extends Payload {
  scope: S;
  loadKey: string;
  data: D[];
}

export interface LoadFailedPayload<S> extends Payload {
  scope: S;
  loadKey: string;
  error: Error;
}

export default abstract class ScopedCollectionDuck<S, D> extends ScopedDuck<S, ScopedCollectionScopedState<D>> {
  static LOAD_REQUESTED = 'LOAD_REQUESTED';
  static LOAD_SUCCEEDED = 'LOAD_SUCCEEDED';
  static LOAD_FAILED = 'LOAD_FAILED';

  constructor(namespace: string) {
    super(namespace);
    const LOAD_REQUESTED = this.getLoadRequestedActionType();
    const LOAD_SUCCEEDED = this.getLoadSucceededActionType();
    const LOAD_FAILED = this.getLoadFailedActionType();
    this.registerHandler(LOAD_REQUESTED, this.handleLoadRequested);
    this.registerHandler(LOAD_SUCCEEDED, this.handleLoadSucceeded);
    this.registerHandler(LOAD_FAILED, this.handleLoadFailed);
  }

  getLoadRequestedActionType() {
    return this.buildActionType(ScopedCollectionDuck.LOAD_REQUESTED);
  }

  getLoadSucceededActionType() {
    return this.buildActionType(ScopedCollectionDuck.LOAD_SUCCEEDED);
  }

  getLoadFailedActionType() {
    return this.buildActionType(ScopedCollectionDuck.LOAD_FAILED);
  }

  loadAction = (scope: S): ThunkAction => {
    return async (dispatch, getState, extraArguments) => {
      const loadKey = generateRandomKey();
      const loadRequestedAction: Action<LoadRequestedPayload<S>> = {
        type: this.getLoadRequestedActionType(),
        payload: { scope, loadKey },
      };
      dispatch(loadRequestedAction);
      try {
        const data = await this.load(scope, dispatch, getState, extraArguments);
        const loadSucceededAction: Action<LoadSucceededPayload<S, D>> = {
          type: this.getLoadSucceededActionType(),
          payload: { scope, loadKey, data },
        };
        dispatch(loadSucceededAction);
      } catch (error) {
        const loadFailedAction: Action<LoadFailedPayload<S>> = {
          type: this.getLoadFailedActionType(),
          payload: { scope, loadKey, error },
        };
        dispatch(loadFailedAction);
        throw error;
      }
    };
  }

  protected getInitialScopedState(scope: S) {
    return {
      loadKey: null,
      isLoading: false,
      isLoaded: false,
      loadError: null,
      data: null,
    };
  }

  protected abstract load(scope: S, dispatch: Dispatch, getState: GetState, extraArguments: ExtraArguments): Promise<D[]>;

  protected handleLoadRequested = (
    state: ScopedCollectionState<D>,
    payload: LoadRequestedPayload<S>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    const scopedState = this.getScopedState(state, payload.scope);
    return {
      ...state,
      [scopeHash]: {
        ...scopedState,
        loadKey: payload.loadKey,
        isLoading: true,
        loadError: null,
      },
    };
  }

  protected handleLoadSucceeded = (
    state: ScopedCollectionState<D>,
    payload: LoadSucceededPayload<S, D>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    const scopedState = this.getScopedState(state, payload.scope);
    if (payload.loadKey !== scopedState.loadKey) {
      return state;
    }
    return {
      ...state,
      [scopeHash]: {
        ...scopedState,
        isLoading: false,
        isLoaded: true,
        data: payload.data,
      },
    };
  }

  protected handleLoadFailed = (
    state: ScopedCollectionState<D>,
    payload: LoadFailedPayload<S>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    const scopedState = this.getScopedState(state, payload.scope);
    if (payload.loadKey !== scopedState.loadKey) {
      return state;
    }
    return {
      ...state,
      [scopeHash]: {
        ...scopedState,
        isLoading: false,
        loadError: payload.error,
      },
    };
  }
}
