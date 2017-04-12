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

        return {
            type: this.type(stage),
            handler
        }
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

    static createReducer(...actionHandlers) {
        return (state, action, fullState) => {
            if (!state) {
                return { };
            }

            actionHandlers.forEach((actionHandler) => {
                if (action.type === actionHandler.type) {
                    const newState = actionHandler.handler(state, action.payload, fullState);
                    if (newState !== undefined) {
                        state = newState;
                    }
                }
            });

            return state;
        };
    }
}
