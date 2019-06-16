import generateRandomKey from '../../utils/generateRandomKey';
import Duck from './Duck';
import { Action, Payload, ThunkAction, Dispatch, GetState, ExtraArguments } from '../types';

export interface ResourceState<D> {
  loadKey: string | null;
  isLoading: boolean;
  isLoaded: boolean;
  loadError: Error | null;
  data: D | null;
}

export interface LoadRequestedPayload extends Payload {
  loadKey: string;
}

export interface LoadSucceededPayload<D> extends Payload {
  loadKey: string;
  data: D;
}

export interface LoadFailedPayload extends Payload {
  loadKey: string;
  error: Error;
}

export default abstract class ResourceDuck<D> extends Duck<ResourceState<D>> {
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
    return this.buildActionType(ResourceDuck.LOAD_REQUESTED);
  }

  getLoadSucceededActionType() {
    return this.buildActionType(ResourceDuck.LOAD_SUCCEEDED);
  }

  getLoadFailedActionType() {
    return this.buildActionType(ResourceDuck.LOAD_FAILED);
  }

  loadAction = (): ThunkAction => {
    return async (dispatch, getState, extraArguments) => {
      const loadKey = generateRandomKey();
      const loadRequestedAction: Action<LoadRequestedPayload> = {
        type: this.getLoadRequestedActionType(),
        payload: { loadKey },
      };
      dispatch(loadRequestedAction);
      try {
        const data = await this.load(dispatch, getState, extraArguments);
        const loadSucceededAction: Action<LoadSucceededPayload<D>> = {
          type: this.getLoadSucceededActionType(),
          payload: { loadKey, data },
        };
        dispatch(loadSucceededAction);
      } catch (error) {
        const loadFailedAction: Action<LoadFailedPayload> = {
          type: this.getLoadFailedActionType(),
          payload: { loadKey, error },
        };
        dispatch(loadFailedAction);
        throw error;
      }
    };
  }

  protected abstract load(dispatch: Dispatch, getState: GetState, extraArguments: ExtraArguments): Promise<D>;

  protected getInitialState() {
    return {
      loadKey: null,
      isLoading: false,
      isLoaded: false,
      loadError: null,
      data: null,
    };
  }

  protected handleLoadRequested = (
    state: ResourceState<D>,
    payload: LoadRequestedPayload,
  ) => {
    return {
      ...state,
      loadKey: payload.loadKey,
      isLoading: true,
      loadError: null,
    };
  }

  protected handleLoadSucceeded = (
    state: ResourceState<D>,
    payload: LoadSucceededPayload<D>,
  ) => {
    if (payload.loadKey !== state.loadKey) {
      return state;
    }
    return {
      ...state,
      isLoading: false,
      isLoaded: true,
      data: payload.data,
    };
  }

  protected handleLoadFailed = (
    state: ResourceState<D>,
    payload: LoadFailedPayload,
  ) => {
    if (payload.loadKey !== state.loadKey) {
      return state;
    }
    return {
      ...state,
      isLoading: false,
      loadError: payload.error,
    };
  }
}
