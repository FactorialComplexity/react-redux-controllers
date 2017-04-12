import Action from "./utils/Action";

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
    
    createAction(action) {
        const key = action;
        if (typeof action === "string") {
            action = new Action(this[_mountPath] + "." + action);
        }
        
        this[_actions][key] = action;
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

    reducer() {
        // to be overriden in children
    }

    beforeRun() {
        // to be overriden in children
    }

    afterRehydrate() {
        // to be overriden in children
    }
    
    mapStateToProps(state, context, { pickProps, omitProps, overrideProps } = { }) {
        const props = { };
        
        if (!overrideProps) {
            overrideProps = { };
        }
        
        getAllClassMethods(this).forEach((key) => {
            if (!((!(pickProps && pickProps.indexOf(propName) === -1) ||
                !(omitProps && omitProps.indexOf(propName) !== -1)) && !this[key].doNotMap))
            {
                return;
            }
            
            var shouldMap = false, propName;
            if (/^get/.test(key)) {
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
                    props[propName] = this[key](state, context);
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
            "beforeRun",
            "afterRehydrate",
            "mapStateToProps",
            "mapDispatchToProps",
            "doNotMap"
        ];
        
        if (!overrideProps) {
            overrideProps = { };
        }
        
        getAllClassMethods(this).forEach((key) => {
            if (!/^(get|_)/.test(key) && !/^(is|_)/.test(key) &&
                defaultOmitFunctions.indexOf(key) === -1 &&
                !this[key].doNotMap)
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

    static named(name) {
        return {
            cls: this,
            name: name
        };
    }
}
