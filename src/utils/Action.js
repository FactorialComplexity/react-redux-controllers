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
        return this.baseType + (stage ? '.' + stage : '');
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

        return Object.assign(handler, { type: this.type(stage) });
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
    
    static initial(functionOrState) {
        if (typeof functionOrState === "function") {
            return Object.assign(functionOrState, { initial: true });
        } else {
            return Object.assign(() => functionOrState, { initial: true });
        }
    }

    static createReducer(...args) {
        var actionHandlers = args, key;
        if (typeof args[0] === "string") {
            key = args[0];
            actionHandlers = args.slice(1);
        }
        
        actionHandlers = actionHandlers.filter((h) => !h.initial);
        const initializer = actionHandlers.filter((h) => h.initial)[0];
        
        return (state, action, fullState) => {
            let parentState;
            if (key) {
                parentState = state;
                state = state[key];
            }
            
            if (!state) {
                state = initializer ? initializer() : { };
            } else {
                actionHandlers.forEach((actionHandler) => {
                    if (action.type === actionHandler.type || actionHandler.type === undefined) {
                        const newState = actionHandler(state,
                            actionHandler.type === undefined ? action : action.payload,
                            fullState);
                        if (newState !== undefined) {
                            state = newState;
                        }
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
