import Action from "./Action";

export const __store = Symbol('store');
export const __mountPath = Symbol('mountPath');
export const __mountPathString = Symbol('mountPathString');

const __selectors = Symbol('selectors');
const __selectorsByKey = Symbol('selectorsByKey');
const __actions = Symbol('actions');


const getAllClassMethods = (obj) => {
  let keys = [], topObject = obj;
  
  do {
    const l = Object.getOwnPropertyNames(obj)
      .sort()
      .filter((p, i, arr) =>
        typeof topObject[p] === 'function' &&  //only the methods
        p !== 'constructor' && //not the constructor
        (i == 0 || p !== arr[i - 1]) && //not overriding in this prototype
        keys.indexOf(p) === -1 //not overridden in a child
      );
    keys = keys.concat(l);
  }
  while (
    //walk-up the prototype chain
    (obj = Object.getPrototypeOf(obj)) &&
    //not the the Object prototype methods (hasOwnProperty, etc...)
    Object.getPrototypeOf(obj)
  )

  return keys;
}

export default class Controller {
  constructor() {
    this[__actions] = { };
  }
  
  static is(instance) {
    // Enough to consider instance to be a Controller for most cases
    return instance && typeof instance.reducer === 'function';
  }

  get store() {
    return this[__store];
  }

  get mountPath() {
    return this[__mountPath];
  }

  get mountPathString() {
    return this[__mountPathString];
  }
  
  get actions() {
    return this[__actions];
  }
  
  get dispatch() {
    return this[__store].dispatch;
  }
  
  createAction(action, key) {
    if (typeof action === "string") {
      const baseType = () => (this[__mountPathString] + "/" + action);
      this[__actions][action] = new Action(baseType);
    } else {
      this[__actions][key || action.type()] = action;
    }
  }
  
  dispatchAction(actionType, payload) {
    const dotI = actionType.indexOf(".");
    const actionBaseType = dotI === -1 ?
        actionType : actionType.substring(0, dotI);
    const actionStage = dotI === -1 ?
        undefined : actionType.substring(dotI+1);
    
    this.store.dispatch(this.actions[actionBaseType].action(
        actionStage, payload));
  }
  
  createReducer(...args) {
    return Action.createReducer(...args);
  }
    
  /**
   * Get the part of the stored state, managed by the controller.
   *
   * @param {Object} state The root of the state tree managed by the Redux
   *    store.
   */
  $$(state) {
    let innerState = state;
    this[__mountPath].forEach((key) => {
      innerState = innerState[key];
    });
    return innerState;
  }
    
  /**
   * Select the specified path of the stored state. If no path is specified
   * (any falsey value or "*"), the full state of the tree is returned. All the
   * required selector functions are called in both cases.
   *
   * @param {Object} state The root of the state tree managed by the Redux
   *    store.
   * 
   * @param {(string|string[])=} path The path of the sub tree to obtain from
   *    the state, relative to the controller mount path. It should either be a
   *    string of dot separated keys or an array of strings. Falsey value as
   *    well as not specifying this parameter makes the function to return the
   *    full state managed by the controller.
   */
  $(state, path) {
    let _state, _path;
    if (arguments.length === 1) {
      // either state or path
      if (Array.isArray(arguments[0]) || typeof arguments[0] === 'string') {
        _path = arguments[0];
        _state = this.store.getState();
      } else {
        _state = arguments[0];
      }
    } else if (arguments.length > 1) {
      _state = arguments[0];
      _path = arguments[1];
    }
    
    const all = !_path || (_path.length === 0) || _path === '*';
    
    if (!this[__selectors]) {
      // cache selectors
      this[__selectors] = this
          .getAllSelectKeys()
          .map((key) => ({
            key: key.substr('$'.length + 1),
            selector: this[key].bind(this)
          }));
      
      this[__selectorsByKey] = this[__selectors].reduce(
          (res, s) => Object.assign(res, {[s.key]: s.selector}), {});
    }
    
    const $$state = this.$$(_state);
    if (all) {
      const selectedState = Object.keys($$state)
          .filter((key) => key[0] !== '_')
          .reduce((res, key) => Object.assign(res, {
            [key]: $$state[key]
          }), {});

      this[__selectors]
          .reduce((res, s) => Object.assign(res, {
            [s.key]: s.selector(_state)
          }), selectedState);
    
      return selectedState;
    } else {
      if (typeof _path === 'string') {
        _path = _path.split('.').filter((el) => el.length > 0);
      }
      
      let selectedState = $$state;
      for (let i=0; i<_path.length; ++i) {
        if (i === 0 && this[__selectorsByKey][_path[i]]) {
          selectedState = this[__selectorsByKey][_path[i]](_state);
        } else {
          selectedState = selectedState[_path[i]];
        }
      }
      return selectedState;
    }
  }
    
  reducer() {
      // to be overriden in children
  }

  /**
   * Executed for all controllers after createStore() was called.
   * At this point all of the controllers are created and store is initialized.
   */
  afterCreateStore() {
      // to be overriden in children
  }
  
  /**
   * Returns array of all dispatch* function names defined in the Controller.
   */
  getAllDispatchKeys() {
    return getAllClassMethods(this)
        .filter((key) => /^dispatch./.test(key) &&
            key !== 'dispatchAction' &&
            typeof this[key] === 'function');
  }
  
  /**
   * Returns array all select* function names defined in the Controller.
   */
  getAllSelectKeys() {
    return getAllClassMethods(this)
      .filter((key) => /^\$./.test(key) && typeof this[key] === 'function');
  }
  
  /**
   * This method is used by Container for optimizations. It checks if the state
   * was changed comparing to an old state, so selectors need to be reevaluated.
   * By default it compares state objects by reference (`===`). This should
   * be fine if your state is immutable, which is highly recommended. Otherwise
   * you are responsible for overriding this check according to your needs or
   * just return false if you want reevaluate all selectors each time the state
   * tree is updated.
   *
   * Its purpose is basically the same as of `options.areStatesEqual` argument
   * to `connect` function from `react-redux` library.
   */
  areStatesEqual($$prev, $$next) {
    return $$prev === $$next;
  }
}
