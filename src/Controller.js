import Action from "./Action";

const _application = Symbol('application');
const _mountPath = Symbol('mountPath');
const _mountPathString = Symbol('mountPathString');
const _actions = Symbol('actions');


const getAllClassMethods = (obj) => {
    let keys = [], topObject = obj;
    
    do {
        const l = Object.getOwnPropertyNames(obj)
            .sort()
            .filter((p, i, arr) =>
                typeof topObject[p] === 'function' &&  //only the methods
                p !== 'constructor' &&           //not the constructor
                (i == 0 || p !== arr[i - 1]) &&  //not overriding in this prototype
                keys.indexOf(p) === -1           //not overridden in a child
            );
        keys = keys.concat(l);
    }
    while (
        (obj = Object.getPrototypeOf(obj)) &&   //walk-up the prototype chain
        Object.getPrototypeOf(obj)              //not the the Object prototype methods (hasOwnProperty, etc...)
    )

    return keys;
}

export default class Controller {
    constructor(application, mountPath) {
        this[_application] = application;
        this[_mountPath] = mountPath;
        this[_mountPathString] = mountPath.join('.');
        this[_actions] = { };
    }

    get application() {
        return this[_application];
    }

    get mountPath() {
        return this[_mountPath];
    }

    get mountPathString() {
        return this[_mountPathString];
    }
    
    get actions() {
        return this[_actions];
    }
    
    createAction(action, key) {
        if (typeof action === "string") {
            this[_actions][action] = new Action(this[_mountPath] + "." + action);
        } else {
            this[_actions][key || action.type()] = action;
        }
    }
    
    dispatchAction(actionType, payload) {
        const dotI = actionType.indexOf(".");
        const actionBaseType = dotI === -1 ? actionType : actionType.substring(0, dotI);
        const actionStage = dotI === -1 ? undefined : actionType.substring(dotI+1);
        
        this.application.store.dispatch(this.actions[actionBaseType].action(actionStage, payload));
    }
    
    rootState(state) {
        let innerState = state;
        this[_mountPath].forEach((key) => {
            innerState = innerState[key];
        });
        return innerState;
    }
    
    $(state) {
        let innerState = state;
        this[_mountPath].forEach((key) => {
            innerState = innerState[key];
        });
        return innerState;
    }

    createReducer(...args) {
        return Action.createReducer(...args);
    }

    reducer() {
        // to be overriden in children
    }

    afterCreateStore() {
        // to be overriden in children
    }
    
    mapStateToProps(state, context, { pickProps, omitProps, overrideProps } = { }) {
        const props = { };
        
        if (!overrideProps) {
            overrideProps = { };
        }
        
        getAllClassMethods(this).forEach((key) => {
            if (!((!(pickProps && pickProps.indexOf(propName) === -1) ||
                !(omitProps && omitProps.indexOf(propName) !== -1)) &&
                !this[key].doNotMap &&
                !this[key].mapAsDispatch))
            {
                return;
            }
            
            var shouldMap = false, propName;
            if (this[key].mapAsStateFunction) {
                shouldMap = true;
                propName = key;
            } else if (/^get/.test(key)) {
                shouldMap = true;
                propName = key.substring(3, 4).toLowerCase() + key.substring(4);
            } else if (/^is/.test(key)) {
                shouldMap = true;
                propName = key;
            }
            
            if (shouldMap) {
                if (overrideProps[propName]) {
                    if (typeof overrideProps[propName] === "function") {
                        props[propName] = overrideProps[propName](this, state, context,
                            { pickProps, omitProps, overrideProps });
                    } else {
                        props[propName] = overrideProps[propName].$func ? overrideProps[propName].$func :
                            overrideProps[propName];
                    }
                } else {
                    if (this[key].mapAsStateFunction) {
                        props[propName] = (...args) => this[key](...args, state, context);
                    } else {
                        props[propName] = this[key](state, context);
                    }
                }
            }
        });
        
        return props;
    }
    
    mapDispatchToProps(dispatch, context, { pickProps, omitProps, overrideProps } = { }) {
        const props = { };
        const defaultOmitFunctions = [
            "rootState",
            "$",
            "reducer",
            "afterCreateStore",
            "mapStateToProps",
            "mapDispatchToProps",
            "doNotMap",
            "mapAsStateFunction",
            "mapAsDispatch"
        ];
        
        if (!overrideProps) {
            overrideProps = { };
        }
        
        getAllClassMethods(this).forEach((key) => {
            if (((!/^(get|_)/.test(key) && !/^(is|_)/.test(key)) || this[key].mapAsDispatch) &&
                defaultOmitFunctions.indexOf(key) === -1 &&
                !this[key].doNotMap &&
                !this[key].mapAsStateFunction)
            {
                if (overrideProps[key]) {
                    if (typeof overrideProps[key] === "function") {
                        props[key] = overrideProps[key](this, dispatch, context,
                            { pickProps, omitProps, overrideProps });
                    } else {
                        props[key] = overrideProps[key].$func ? overrideProps[key].$func :
                            overrideProps[key];
                    }
                } else {
                    props[key] = (...args) => this[key](...args.concat([dispatch, context]));
                }
            }
        });
        
        return props;
    }
    
    doNotMap(...functions) {
        functions.forEach((func) => {
            func.doNotMap = true;
        });
    }
    
    mapAsStateFunction(...functions) {
        functions.forEach((func) => {
            func.mapAsStateFunction = true;
        });
    }
    
    mapAsDispatch(...functions) {
        functions.forEach((func) => {
            func.mapAsDispatch = true;
        });
    }

    static named(name) {
        return {
            cls: this,
            name: name
        };
    }
}
