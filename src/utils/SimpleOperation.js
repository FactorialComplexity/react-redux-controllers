import Action from './Action'

export default class SimpleOperation {
    constructor(mainAction) {
        this.mainAction = mainAction;
    }
    
    createReducer() {
        const {mainAction} = this;
        
        return Action.createReducer(
            mainAction.onStarted((state, action) => {
                return Object.assign({}, state, {
                    [action.key]: {
                        isProcessing: true,
                    }
                });
            }),
    
            mainAction.onSuccess((state, action) => {
                return Object.assign({}, state, {
                    [action.key]: {
                        isProcessing: false,
                        wasCompleted: true
                    }
                });
            }),
    
            mainAction.onError((state, action) => {
                return Object.assign({}, state, {
                    [action.key]: {
                        isProcessing: false,
                        error: action.error
                    }
                });
            })
        );
    }
    
    isProcessing(key, state) {
        return state[key] ? state[key].isProcessing : false;
    }
    
    wasCompleted(key, state) {
        return state[key] ? state[key].wasCompleted : false;
    }
    
    processingError(key, state) {
        return state[key] ? state[key].error : false;
    }
    
    mapStateToProps(state, key) {
        return key ? {
            isProcessing: this.isProcessing(key, state),
            wasCompleted: this.wasCompleted(key, state),
            processingError: this.processingError(key, state)
        } : {
            isProcessing: (aKey) => this.isProcessing(aKey, state),
            wasCompleted: (aKey) => this.wasCompleted(aKey, state),
            processingError: (aKey) => this.processingError(aKey, state)
        };
    }
    
    started(payload) {
        return this.mainAction.started(payload);
    }
    
    success(payload) {
        return this.mainAction.success(payload);
    }
    
    error(payload) {
        return this.mainAction.error(payload);
    }
}
