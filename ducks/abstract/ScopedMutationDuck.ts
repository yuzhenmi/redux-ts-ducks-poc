import generateRandomKey from '../../utils/generateRandomKey';
import ScopedDuck, { ScopedState, ScopedPayload } from './ScopedDuck';
import { Action, ThunkAction, Dispatch, GetState, ExtraArguments } from '../types';

export interface ScopedMutationScopedState<D, R> {
  isInProgress: boolean;
  data: D | null;
  submitKey: string | null;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitError: Error | null;
  result: R | null;
}

export type ScopedMutationState<D, R> = ScopedState<ScopedMutationScopedState<D, R>>;

export interface BeginPayload<S, D> extends ScopedPayload<S> {
  scope: S;
  initialData: D;
}

export interface CancelPayload<S> extends ScopedPayload<S> {
  scope: S;
}

export interface SubmitRequestedPayload<S> extends ScopedPayload<S> {
  scope: S;
  submitKey: string;
}

export interface SubmitSucceededPayload<S, R> extends ScopedPayload<S> {
  scope: S;
  submitKey: string;
  result: R;
}

export interface SubmitFailedPayload<S> extends ScopedPayload<S> {
  scope: S;
  submitKey: string;
  error: Error;
}

export default abstract class ScopedMutationDuck<S, D, R> extends ScopedDuck<S, ScopedMutationScopedState<D, R>> {
  static BEGIN = 'BEGIN';
  static CANCEL = 'CANCEL';
  static SUBMIT_REQUESTED = 'SUBMIT_REQUESTED';
  static SUBMIT_SUCCEEDED = 'SUBMIT_SUCCEEDED';
  static SUBMIT_FAILED = 'SUBMIT_FAILED';

  constructor(namespace: string) {
    super(namespace);
    const BEGIN = this.getBeginActionType();
    const CANCEL = this.getCancelActionType();
    const SUBMIT_REQUESTED = this.getSubmitRequestedActionType();
    const SUBMIT_SUCCEEDED = this.getSubmitSucceededActionType();
    const SUBMIT_FAILED = this.getSubmitFailedActionType();
    this.registerHandler(BEGIN, this.handleBegin);
    this.registerHandler(CANCEL, this.handleCancel);
    this.registerHandler(SUBMIT_REQUESTED, this.handleSubmitRequested);
    this.registerHandler(SUBMIT_SUCCEEDED, this.handleSubmitSucceeded);
    this.registerHandler(SUBMIT_FAILED, this.handleSubmitFailed);
  }

  getBeginActionType() {
    return this.buildActionType(ScopedMutationDuck.BEGIN);
  }

  getCancelActionType() {
    return this.buildActionType(ScopedMutationDuck.CANCEL);
  }

  getSubmitRequestedActionType() {
    return this.buildActionType(ScopedMutationDuck.SUBMIT_REQUESTED);
  }

  getSubmitSucceededActionType() {
    return this.buildActionType(ScopedMutationDuck.SUBMIT_SUCCEEDED);
  }

  getSubmitFailedActionType() {
    return this.buildActionType(ScopedMutationDuck.SUBMIT_FAILED);
  }

  beginAction = (scope: S, initialData: D) => {
    const beginAction: Action<BeginPayload<S, D>> = {
      type: this.getBeginActionType(),
      payload: { scope, initialData },
    };
    return beginAction;
  }

  cancelAction = (scope: S) => {
    const cancelAction: Action<CancelPayload<S>> = {
      type: this.getBeginActionType(),
      payload: { scope },
    };
    return cancelAction;
  }

  submitAction = (scope: S): ThunkAction => {
    return async (dispatch, getState, extraArguments) => {
      const submitKey = generateRandomKey();
      const scopedState = this.getScopedState(this.getOwnState(getState()), scope);
      if (scopedState.isSubmitted) {
        return;
      }
      if (!scopedState.data) {
        throw new Error('Mutation begin action must be called before submit action.');
      }
      const submitRequestedAction: Action<SubmitRequestedPayload<S>> = {
        type: this.getSubmitRequestedActionType(),
        payload: { scope, submitKey },
      };
      dispatch(submitRequestedAction);
      let result: R;
      try {
        result = await this.submit(scope, scopedState.data, dispatch, getState, extraArguments);
        const submitSucceededAction: Action<SubmitSucceededPayload<S, R>> = {
          type: this.getSubmitSucceededActionType(),
          payload: { scope, submitKey, result },
        };
        dispatch(submitSucceededAction);
      } catch (error) {
        const submitFailedAction: Action<SubmitFailedPayload<S>> = {
          type: this.getSubmitFailedActionType(),
          payload: { scope, submitKey, error },
        };
        dispatch(submitFailedAction);
        throw error;
      }
      await this.submitSucceeded(scope, result, scopedState.data, dispatch, getState, extraArguments);
    };
  }

  protected getInitialScopedState(scope: S) {
    return {
      isInProgress: false,
      data: null,
      submitKey: null,
      isSubmitting: false,
      isSubmitted: false,
      submitError: null,
      result: null,
    };
  }

  protected abstract submit(scope: S, data: D, dispatch: Dispatch, getState: GetState, extraArguments: ExtraArguments): Promise<R>;

  protected async submitSucceeded(scope: S, result: R, data: D, dispatch: Dispatch, getState: GetState, extraArguments: ExtraArguments) {}

  protected handleBegin = (
    state: ScopedMutationState<D, R>,
    payload: BeginPayload<S, D>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    return {
      ...state,
      [scopeHash]: {
        ...this.getInitialScopedState(payload.scope),
        isInProgress: true,
        data: payload.initialData,
      },
    };
  }

  protected handleCancel = (
    state: ScopedMutationState<D, R>,
    payload: CancelPayload<S>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    const newState = { ...state };
    delete newState[scopeHash];
    return newState;
  }

  protected handleSubmitRequested = (
    state: ScopedMutationState<D, R>,
    payload: SubmitRequestedPayload<S>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    const scopedState = this.getScopedState(state, payload.scope);
    return {
      ...state,
      [scopeHash]: {
        ...scopedState,
        submitKey: payload.submitKey,
        isSubmitting: true,
        submitError: null,
      },
    };
  }

  protected handleSubmitSucceeded = (
    state: ScopedMutationState<D, R>,
    payload: SubmitSucceededPayload<S, R>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    const scopedState = this.getScopedState(state, payload.scope);
    if (payload.submitKey !== scopedState.submitKey) {
      return state;
    }
    return {
      ...state,
      [scopeHash]: {
        ...scopedState,
        isSubmitting: false,
        isSubmitted: true,
        result: payload.result,
      },
    };
  }

  protected handleSubmitFailed = (
    state: ScopedMutationState<D, R>,
    payload: SubmitFailedPayload<S>,
  ) => {
    const scopeHash = this.hashScope(payload.scope);
    const scopedState = this.getScopedState(state, payload.scope);
    if (payload.submitKey !== scopedState.submitKey) {
      return state;
    }
    return {
      ...state,
      [scopeHash]: {
        ...scopedState,
        isSubmitting: false,
        submitError: payload.error,
      },
    };
  }
}
