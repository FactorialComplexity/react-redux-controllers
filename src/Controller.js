import Action from "./utils/Action";

const _application = Symbol('application');
const _mountPath = Symbol('mountPath');
const _mountPathString = Symbol('mountPathString');
const _actions = Symbol('actions');


const getAllClassMethods = (obj) => {
    let keys = []
    do {
        const l = Object.getOwnPropertyNames(obj)
            .sort()
            .filter((p, i, arr) =>
                typeof obj[p] === 'function' &&  //only the methods
                p !== 'constructor' &&           //not the constructor
                (i == 0 || p !== arr[i - 1]) &&  //not overriding in this prototype
                keys.indexOf(p) === -1          //not overridden in a child
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
    
    addAction(action) {
        const key = action;
        if (typeof action === "string") {
            action = new Action(this[_mountPath] + "." + action);
        }
        
        this[_actions][key] = action;
    }
    
    rootState(state) {
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
    
    mapStateToProps(state, context, { pickProps, omitProps } = { }) {
        const props = { };
        getAllClassMethods(this).forEach((key) => {
            if (!((!(pickProps && pickProps.indexOf(propName) === -1) ||
                !(omitProps && omitProps.indexOf(propName) !== -1)) && !this[key].doNotMap))
            {
                return;
            }
            
            var shouldMap = false, propName;
            if (/^get/.test(key)) {
                shouldMap = true;
                propName = key.substring(3, 1).toLowerCase() + key.substring(4);
            } else if (/^is/.test(key)) {
                shouldMap = true;
                propName = key;
            }
            
            if (shouldMap) {
                props[propName] = this[key](this.rootState(state), context);
            }
        });
        
        return props;
    }
    
    mapDispatchToProps(dispatch, context, { pickProps, omitProps } = { }) {
        const props = { };
        const defaultOmitFunctions = [
            "rootState",
            "reducer",
            "beforeRun",
            "afterRehydrate",
            "mapStateToProps",
            "mapDispatchToProps",
            "doNotMap"
        ];
        
        getAllClassMethods(this).forEach((key) => {
            if (!/^(get|_)/.test(key) && !/^(is|_)/.test(key) &&
                defaultOmitFunctions.indexOf(key) === -1 &&
                !this[key].doNotMap)
            {
                props[key] = (...args) => this[key](...args.concat([dispatch, context]));
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
