import _Symbol from './utils/_Symbol'

const $$initial = _Symbol('initial');

export default class Action {
  static get Stage() {
    return {
      STARTED: 'started',
      SUCCESS: 'success',
      ERROR: 'error'
    };
  }

  constructor(type) {
    this.baseType = type;
  }

  type(stage) {
    const {baseType} = this;
    return (typeof baseType === 'function' ? baseType() : baseType) +
      (stage ? '.' + stage : '');
  }

  typeStarted() {
    return this.type(Action.Stage.STARTED);
  }

  typeSuccess() {
    return this.type(Action.Stage.SUCCESS);
  }

  typeError() {
    return this.type(Action.Stage.ERROR);
  }

  action() {
    var stage = arguments[0],
      payload = arguments[1],
      error = arguments[2];

    if (arguments.length === 1) {
      stage = undefined;
      payload = arguments[0];
    }

    return {
      type: this.type(stage),
      error,
      payload
    };
  }

  started(payload) {
    return this.action(Action.Stage.STARTED, payload);
  }

  success(payload) {
    return this.action(Action.Stage.SUCCESS, payload);
  }

  error(payload) {
    return this.action(Action.Stage.ERROR, payload, true);
  }

  on() {
    var stage = arguments[0], handler = arguments[1];
    if (arguments.length === 1) {
      stage = undefined;
      handler = arguments[0];
    }
    
    return (state, action, fullState) => {
      if (action.type === this.type(stage)) {
        return handler(state, action.payload, fullState);
      }
    };
  }

  onStarted(handler) {
    return this.on(Action.Stage.STARTED, handler);
  }

  onSuccess(handler) {
    return this.on(Action.Stage.SUCCESS, handler);
  }

  onError(handler) {
    return this.on(Action.Stage.ERROR, handler);
  }
  
  static initial(valueOrFunc) {
    const func = typeof valueOrFunc === 'function' ? valueOrFunc : () => valueOrFunc

    Object.defineProperty(func, $$initial, {
      value: true
    })

    return func
  }
  
  static createReducer(...args) {
    var actionHandlers = args, key;
    if (typeof args[0] !== "function") {
      if (typeof args[0] === "string") {
        key = args[0];
      }
      
      actionHandlers = args.slice(1);
    }
    
    var initial = actionHandlers.find((h) => h[$$initial]) || (() => ({}));
    actionHandlers = actionHandlers.filter((h) => !h[$$initial]);
    
    return (state, action) => {
      let parentState;
      if (key) {
        parentState = state;
        state = state[key];
      }
      
      if (state === undefined) {
        state = initial();
      } else {
        actionHandlers.forEach((actionHandler) => {
          const newState = actionHandler(state, action);
          if (newState !== undefined) {
            state = newState;
          }
        });
      }
      
      if (parentState) {
        return Object.assign({ }, parentState, { [key]: state });
      } else {
        return state;
      }
    };
  }
}
