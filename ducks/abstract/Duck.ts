import { Reducer } from 'redux';

import {
  Payload,
  Action,
} from '../types';
import { RootState } from '../';

export interface State {}
export type Handler<S extends State, P extends Payload> = (state: S, payload: P) => S;

export default abstract class Duck<S extends State> {
  protected namespace: string;
  protected handlers: Map<string, Handler<S, any>>;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.handlers = new Map();
  }

  protected abstract getInitialState(): S;

  getReducer() {
    const reducer: Reducer<S, Action> = (state: S = this.getInitialState(), action: Action) => {
      if (!this.handlers.has(action.type)) {
        return state;
      }
      const handler = this.handlers.get(action.type)!;
      return handler(state, action.payload);
    };
    return reducer;
  }

  protected registerHandler<P extends Payload>(actionType: string, handler: Handler<S, P>) {
    this.handlers.set(actionType, handler);
  }

  protected buildActionType(key: string) {
    return `app/${this.namespace}/${key}`;
  }

  protected getOwnState(rootState: RootState) {
    return (rootState as any)[this.namespace] as S;
  }
}
