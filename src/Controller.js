import Action from './Action'
import _Symbol from './utils/_Symbol'

export const __store = _Symbol('store')
export const __mountPath = _Symbol('mountPath')
export const __mountPathString = _Symbol('mountPathString')

const __selectors = _Symbol('selectors')
const __selectorsByKey = _Symbol('selectorsByKey')
const __actions = _Symbol('actions')

const getAllClassMethods = (obj) => {
  let keys = []
  let topObject = obj

  const onlyOriginalMethods = (p, i, arr) =>
    typeof topObject[p] === 'function' &&  // only the methods
    p !== 'constructor' && // not the constructor
    (i === 0 || p !== arr[i - 1]) && // not overriding in this prototype
    keys.indexOf(p) === -1 // not overridden in a child

  do {
    const l = Object.getOwnPropertyNames(obj)
      .sort()
      .filter(onlyOriginalMethods)
    keys = keys.concat(l)

    // walk-up the prototype chain
    obj = Object.getPrototypeOf(obj)
  } while (
    // not the the Object prototype methods (hasOwnProperty, etc...)
    obj && Object.getPrototypeOf(obj)
  )

  return keys
}

/**
 * Base class for controllers. Controllers are responsible for managing the certain part of the
 * **state**, which includes:
 *
 *  - *Sending* relevant **actions** in response to certain related events.
 *  - *Modifying* the state by providing the relevant **reducer**.
 *  - *Providing access* and if necessary *transforming* the data in the managed part of the
 *    **state**.
 *
 * Controller is intended to be subclassed. It won't work as is, because it doesn't provide
 * a reducer function ([reducer()]{@link Controller#reducer} returns `undefined`).
 *
 * The only function mandatory for overriding is:
 *
 *  - [reducer()]{@link Controller#reducer} - to provide the reducer function.
 *
 * You may also need to override:
 *
 *  - [afterCreateStore()]{@link Controller#afterCreateStore} - will be called for all Controllers
 *    after Redux store was created and all Controllers were mounted.
 *  - [areStatesEqual()]{@link Controller#areStatesEqual} - to control the optimizations done by
 *    {@link Container}. If you follow Redux recommendation of immutability and your Controller
 *    selector methods only transform the global state (which is also highly recommended), you do
 *    **not need** to override this method.
 *
 * In order to utilize the full power of the framework, subclasses define two types of functions:
 *
 *  - **Selectors** transform the part of the Controller-managed state into different structure.
 *    Any method that starts with `$` symbol is considered to be a selector.
 *  - **Dispatches** are special functions that are expected to dispatch some actions either
 *    synchronously or asynchronously. Any method that starts with `dispatch` is considered to be
 *    a dispatch method.
 *
 * @example
 * class ToDoController extends Controller {
 *   constructor() {
 *     super()
 *     this.createAction('add')
 *   }
 *
 *   // Dispatch function. Will be mapped as `add(text)` in Container
 *   dispatchAdd(text) {
 *     this.dispatchAction('add', text)
 *   }
 *
 *   // Selector function. Will be used to collect data for `props.text` in Container
 *   $texts(state) {
 *     return (this.$$(state)._items || []).map((item) => item.text)
 *   }
 *
 *   reducer() {
 *     const { add } = this.actions
 *     return this.createReducer(
 *       add.on((state, text) => ({
 *         _items: (state._items || []).concat({ text })
 *       }))
 *     )
 *   }
 * }
 */
class Controller {
  /**
   * Constructor is a good place to create all [actions]{@link Action} that Controller needs.
   * And of course to pass and store any external dependencies and parameters Controller needs
   * to function.
   */
  constructor () {
    this[__actions] = { }
  }

  /**
   * Checks if provided value *looks like* an instance of the Controller class. It does pretty
   * minimal check and should not be relied to actually detect the fact of being Controller's
   * subclass if needed.
   *
   * @param instance Value to be checked.
   */
  static is (value) {
    // Enough to consider instance to be a Controller for most cases
    return value && typeof value.reducer === 'function'
  }

  /**
   * Redux store object this controller is mounted to.
   * @type {Store}
   */
  get store () {
    return this[__store]
  }

  /**
   * Path under which this controller is mounted as the array of keys.
   * @type {string[]}
   */
  get mountPath () {
    return this[__mountPath]
  }

  /**
   * Path under which this controller is mounted as the single string. Path components are joined
   * with `.` (dot) symbol.
   * @type {string}
   */
  get mountPathString () {
    return this[__mountPathString]
  }

  /**
   * Array of [Actions]{@link Action} previously created by
   * [Controller.createAction()]{@link Controller#createAction} calls.
   * @type {Object.<string, Action>}
   */
  get actions () {
    return this[__actions]
  }

  /**
   * Redux store `dispatch()` function.
   * @type {function}
   */
  get dispatch () {
    return this[__store] ? this[__store].dispatch : undefined
  }

  /**
   * Create new {@link Action} and attach it to [Controller.actions]{@link Controller#actions}.
   * Intended to be used from inside the Controller. If provided a string key the {@link Action}
   * will be created with type equal to `${Controller.mountPathString}/${action}`.
   *
   * @param {string|Action} action String to be used as action key in {@link Controller#actions}
   *   and as a part of [Action.baseType]{@link Action#baseType}. Alternatively the ready made
   *   {@link Action} can be specified to be attached to the Controller.
   * @param {(string)} key If {@link Action} object was passed as first argument, this defines
   *    a key to be used in [Controller.actions]{@link Controller#actions}.
   *
   * @example
   * // Create new action with key "update" and attach it to the Controller
   * this.createAction("update")
   *
   * // Attach existing Action to the Controller using key "load"
   * this.createAction(loadAction, "load")
   *
   * // Later on these actions are available in this.actions:
   * const { update, load } = this.actions
   */
  createAction (action, key) {
    if (typeof action === 'string') {
      const baseType = () => (this[__mountPathString] + '/' + action)
      this[__actions][action] = new Action(baseType)
    } else {
      this[__actions][key || action.type()] = action
    }
  }

  /**
   * Dispatch the {@link Action} into the store by key and optionally a stage with the provided
   * payload. This is a shortcut method provided for convenience. Is it intended to be used from
   * inside the Controller.
   *
   * @param {string} actionType Action key string with optional stage (see {@link Action}).
   * @param payload Any object that should be sent as action payload.
   *
   * @example
   * // Dispatch action with key "update"
   * dispatchAction("update", { objectId: "1" })
   *
   * // Dispatch action with key "update" and stage "started"
   * dispatchAction("update.started", { objectId: "1" })
   */
  dispatchAction (actionType, payload) {
    // TODO: error processing if action was not found.

    const dotI = actionType.indexOf('.')
    const actionBaseType = dotI === -1
        ? actionType : actionType.substring(0, dotI)
    const actionStage = dotI === -1
        ? undefined : actionType.substring(dotI + 1)

    if (actionStage === 'error') {
      this.store.dispatch(this.actions[actionBaseType].error(payload))
    } else {
      this.store.dispatch(this.actions[actionBaseType].action(
          actionStage, payload))
    }
  }

  /**
   * This a convenience function, which simply calls
   * [Action.createReducer()]{@link Action#createReducer} passing through all of the arguments.
   */
  createReducer (...args) {
    return Action.createReducer(...args)
  }

  /**
   * Get the raw part of the stored state, managed by the controller. No selectors
   * will be called and no dispatches to be added to the result.
   *
   * @param {Object} state The root of the state tree managed by the Redux
   *    store.
   */
  $$ (state) {
    let innerState = state
    this[__mountPath].forEach((key) => {
      innerState = innerState ? innerState[key] : undefined
    })
    return innerState
  }

  /**
   * Select the value at specified path of the stored state. If no path is specified
   * (any falsey value or `"*"`), the full state of the tree is returned. All the
   * required selector functions are called in both cases, first level keys in teh state that
   * start with underscore symbol (`_`) are considered "private" and ommitted.
   *
   * @param {Object} state The root of the state tree managed by the Redux
   *    store.
   *
   * @param {(string|string[])=} path The path of the sub tree to obtain from
   *    the state, relative to the controller mount path. It should either be a
   *    string of dot separated keys or an array of strings. Falsey value as
   *    well as not specifying this parameter makes the function to return the
   *    full state managed by the controller.
   *
   * @returns Value selected from the specified path or `undefined` if nothing found
   *    at the specified path.
   */
  $ (state, path) {
    let _state, _path
    if (arguments.length === 1) {
      // either state or path
      if (Array.isArray(arguments[0]) || typeof arguments[0] === 'string') {
        _path = arguments[0]
        _state = this.store.getState()
      } else {
        _state = arguments[0]
      }
    } else if (arguments.length > 1) {
      _state = arguments[0]
      _path = arguments[1]
    }

    const all = !_path || (_path.length === 0) || _path === '*'

    if (!this[__selectors]) {
      // cache selectors
      this[__selectors] = this
          .getAllSelectKeys()
          .map((key) => ({
            key: key.substr('$'.length),
            selector: this[key].bind(this)
          }))

      this[__selectorsByKey] = this[__selectors].reduce(
          (res, s) => Object.assign(res, {[s.key]: s.selector}), {})
    }

    const $$state = this.$$(_state)
    if (all) {
      const selectedState = Object.keys($$state)
          .filter((key) => key[0] !== '_')
          .reduce((res, key) => Object.assign(res, {
            [key]: $$state[key]
          }), {})

      this[__selectors]
          .reduce((res, s) => Object.assign(res, {
            [s.key]: s.selector(_state)
          }), selectedState)

      return selectedState
    } else {
      if (typeof _path === 'string') {
        _path = _path.split('.').filter((el) => el.length > 0)
      }

      let selectedState = $$state
      for (let i = 0; i < _path.length; ++i) {
        if (i === 0 && this[__selectorsByKey][_path[i]]) {
          selectedState = this[__selectorsByKey][_path[i]](_state)
        } else {
          selectedState = selectedState[_path[i]]
        }
      }
      return selectedState
    }
  }

  /**
   * Passed as a callback to [Controller.subscribe()]{@link Controller#subscribe}.
   * @callback Controller~SubscribeListener
   * @param value Current value at the subscribed path.
   * @param prevValue Previous value at the subscribed path.
   */

  /**
   * Subscribes to changes of some value at path relative to the controller.
   *
   * @param {string|Array.<string>}
   * @param {Controller~SubscribeListener}
   */
  subscribe (path, listener, isEqual = (value, prevValue) => (value === prevValue)) {
    let value = this.$(path)

    return this.store.subscribe(() => {
      let prevValue = value
      value = this.$(path)

      if (!isEqual(prevValue, value)) {
        listener(value, prevValue)
      }
    })
  }

  /**
   * Called when Controller reducer is needed for the first time. Override this method and return
   * the reducer function. Reducer function is executed on the part state where Controller
   * was mounted. It is recommended to utilize {@link Action} and convenience functions
   * [Controller.createReducer]{@link Controller#createReducer},
   * [Controller.createAction]{@link Controller#createAction} and
   * [Controller.dispatchAction]{@link Controller#dispatchAction}, but is not mandatory. A regular
   * Redux reducer function will also work just fine.
   *
   * @returns {function} Reducer function.
   *
   * @example
   * reducer() {
   *   const { update } = this.actions
   *
   *   return this.createReducer(
   *     update.onStarted((state, payload) => ({...state, isUpdating: true })),
   *     update.onSuccess((state, items) => ({...state, items, isUpdating: false }))
   *   )
   * }
   */
  reducer () {
    // to be overriden in children
  }

  /**
   * Executed for all controllers after createStore() was called.
   * At this point all of the controllers are created and store is initialized.
   */
  afterCreateStore () {
    // to be overriden in children
  }

  /**
   * Returns array of all dispatch* function names defined in the Controller.
   *
   * @private
   */
  getAllDispatchKeys () {
    return getAllClassMethods(this).filter((key) => /^dispatch./.test(key) &&
      key !== 'dispatchAction' && typeof this[key] === 'function')
  }

  /**
   * Returns array of all $* function names (selectors) defined in the Controller.
   *
   * @private
   */
  getAllSelectKeys () {
    return getAllClassMethods(this)
      .filter((key) => /^\$[^$]+/.test(key) && typeof this[key] === 'function')
  }

  /**
   * This method is used by [Controller.hasChanges]{@link Controller#hasChanges} by default.
   * It checks if the state was changed comparing to an old state, so selectors need to be
   * reevaluated. By default it compares state objects by reference (`===`). This should
   * be fine if your state is immutable, which is highly recommended. Otherwise
   * you are responsible for overriding this check according to your needs or
   * just return false if you want reevaluate all selectors each time the state
   * tree is updated.
   *
   * Its purpose is basically the same as of `options.areStatesEqual` argument
   * to `connect` function from `react-redux` library.
   *
   * If you need to check the parts of the state, not managed by the controller,
   * override [Controller.hasChanges]{@link Controller#hasChanges} instead.
   *
   * @param $$prev Previous value of part of the state managed by the Controller.
   * @param $$next Next value part of the state managed by the Controller to be compared.
   */
  areStatesEqual ($$prev, $$next) {
    return $$prev === $$next
  }
  
  /**
   * This method is used by {#link Container} for optimizations. It checks if the state
   * was changed comparing to an old state, so selectors need to be reevaluated.
   * By default it calls [Controller.areStatesEqual]{@link Controller#areStatesEqual}
   * and returns the opposite boolean value.
   *
   * It is useful, if controller selects parts of the state, not managed by itself.
   *
   * @param prevState Previous Redux state value.
   * @param next Next Redux state value.
   */
  hasChanges (prevState, nextState) {
    return !this.areStatesEqual(this.$$(prevState), this.$$(nextState))
  }
}

export default Controller
