import Duck from './Duck';

export interface ScopedState<SS> {
  [scopeHash: string]: SS;
}

export interface ScopedPayload<S> {
  scope: S;
}

export default abstract class ScopedDuck<S, SS> extends Duck<ScopedState<SS>> {

  getScopedState = (state: ScopedState<SS>, scope: S) => {
    return state[this.hashScope(scope)] || this.getInitialScopedState(scope);
  }

  protected hashScope(scope: S) {
    return JSON.stringify(scope);
  };

  protected getInitialState() {
    return {};
  }

  protected abstract getInitialScopedState(scope: S): SS;
}
