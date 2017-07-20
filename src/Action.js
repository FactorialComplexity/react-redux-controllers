import _Symbol from './utils/_Symbol'

const $$initial = _Symbol('initial')

/**
 * Utility class for dealing with Redux actions. The instance of the class acts like an identifier
 * for action. Under the hood it stil uses string identifiers and follows
 * [Flux Standard Action]{@link https://github.com/acdlite/flux-standard-action}.
 *
 * Actions can have "stages", which are basically separate actions from Redux point of view. They
 * can be used to logically  group otherwise different actions if they represent the same action,
 * but happening in multiple stages (e.g. consider asynchronous request pattern "started" ->
 * "success" or "error").
 *
 * @example
 * const todoAdded = new Action("todoAdded")
 *
 * // Dispatch
 * dispatch(todoAdded.action({ text: "Todo text" }))
 *
 * // Reducer
 * const reducer = Action.createReducer(
 *   Action.initial({ todos: [] }), // default initial value is { }
 *
 *   todoAdded.on((state, item) => ({ todos: [...state.todos, item] }))
 * )
 */
class Action {
  /**
   * @namespace
   * @property {string} STARTED - An asynchronous operation was started.
   * @property {string} SUCCESS - An asynchronous operation was completed with success.
   * @property {string} ERROR - Action resolved to error. Payload contains `{ error: true }`
   *   and [Error]{@link https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Error}
   *   object as a payload.
   */
  static get Stage () {
    return {
      STARTED: 'started',
      SUCCESS: 'success',
      ERROR: 'error'
    }
  }

  /**
   * @param {string} baseType Base type identifier for the action.
   */
  constructor (baseType) {
    this.baseType = baseType
  }

  /**
   * Generates type identifier for specified stage.
   * @param {string=} stage Name of the stage.
   * @returns {string} Type for the action in specified stage.
   */
  type (stage) {
    const {baseType} = this
    return (typeof baseType === 'function' ? baseType() : baseType) +
      (stage ? '.' + stage : '')
  }

  /**
   * Generates type identifier for `STARTED` stage.
   * @returns {string} Type for the action in `STARTED` stage.
   * @private
   */
  typeStarted () {
    return this.type(Action.Stage.STARTED)
  }

  /**
   * Generates type identifier for `SUCCESS` stage.
   * @returns {string} Type for the action in `SUCCESS` stage.
   * @private
   */
  typeSuccess () {
    return this.type(Action.Stage.SUCCESS)
  }

  /**
   * Generates type identifier for `ERROR` stage.
   * @returns {string} Type for the action in `ERROR` stage.
   * @private
   */
  typeError () {
    return this.type(Action.Stage.ERROR)
  }

  /**
   * Creates plain action object which can be passed to `dispatch()` function.
   * @param {string=} stage To use when creating the action object.
   * @param payload Payload to be attached to the action object.
   * @returns {Object} Plain action object.
   */
  action () {
    var stage = arguments[0]
    var payload = arguments[1]

    if (arguments.length === 1) {
      stage = undefined
      payload = arguments[0]
    }

    return { type: this.type(stage), payload }
  }

  /**
   * Convenience function. Create plain action object with `STARTED` stage.
   * See [action()]{@link Action#action}.
   * @param payload Payload to be attached to the action object.
   * @returns {Object} Plain action object.
   */
  started (payload) {
    return this.action(Action.Stage.STARTED, payload)
  }

  /**
   * Convenience function. Create plain action object with `SUCCESS` stage.
   * See [action()]{@link Action#action}.
   * @param payload Payload to be attached to the action object.
   * @returns {Object} Plain action object.
   */
  success (payload) {
    return this.action(Action.Stage.SUCCESS, payload)
  }

  /**
   * Convenience function. Create plain action object with `ERROR` stage.
   * See [action()]{@link Action#action}.
   * @param payload Payload to be attached to the action object.
   * @returns {Object} Plain action object.
   */
  error (payload) {
    return { type: this.typeError(), payload, error: true }
  }

  /**
   * Wraps the provided handler function into a condition check, so the function is only called
   * if it receives the action with type equal to one of this action. Stage is taken into account
   * if specified. Reducer function will receive only payload part of the action.
   * @param {stage=} stage Process actions of specified stage.
   * @param {function(state, payload)} handler Handler function.
   * @returns {function} Wrapper handler function.
   */
  on () {
    var stage = arguments[0]
    var handler = arguments[1]

    if (arguments.length === 1) {
      stage = undefined
      handler = arguments[0]
    }

    return (state, action) => {
      if (action.type === this.type(stage)) {
        return handler(state, action.payload)
      }
    }
  }

  /**
   * Convenience function. Wraps handler for processing `STARTED` stage.
   * See [on()]{@link Action#on}.
   * @param {function(state, payload)} handler Handler function.
   * @returns {function} Wrapper handler function.
   */
  onStarted (handler) {
    return this.on(Action.Stage.STARTED, handler)
  }

  /**
   * Convenience function. Wraps handler for processing `SUCCESS` stage.
   * See [on()]{@link Action#on}.
   * @param {function(state, payload)} handler Handler function.
   * @returns {function} Wrapper handler function.
   */
  onSuccess (handler) {
    return this.on(Action.Stage.SUCCESS, handler)
  }

  /**
   * Convenience function. Wraps handler for processing `ERROR` stage.
   * See [on()]{@link Action#on}.
   * @param {function(state, payload)} handler Handler function.
   * @returns {function} Wrapper handler function.
   */
  onError (handler) {
    return this.on(Action.Stage.ERROR, handler)
  }

  /**
   * Pass the result of the call to [createReducer()]{@link Action.createReducer} to define the
   * initial value of the resulting reducer.
   * @param valueOrFunc If function is passed it will be called when reducer needs initial value.
   *   Otherwise provided value is used as is by the reducer.
   * @example
   * Action.createReducer(
   *   Action.initial({ foo: 'bar' })
   * )
   */
  static initial (valueOrFunc) {
    const func = typeof valueOrFunc === 'function' ? valueOrFunc : () => valueOrFunc

    Object.defineProperty(func, $$initial, {
      value: true
    })

    return func
  }

  /**
   * Combines all of the passed handlers to form a single reducer. Handlers can be a wrapped
   * handlers from [Action.on()]{@link Action#on} calls as well as regular reducer functions.
   *
   * The default initial value for reducer is `{ }` (empty object). It can be overridden with
   * [Action.initial()]{@link Action.initial}.
   *
   * If the first argument passed is a string, the resulting reducer will have all of the attached
   * handlers operating on the sub key of the passed state rather than on the state itself.
   *
   * @param {string=} subKey Sub key for handlers to operate on.
   * @param {function} args Handler functions to be combined into the single reducer.
   * @returns {function} Redux-compatible reducer function.
   */
  static createReducer (...args) {
    var actionHandlers = args
    var key

    if (typeof args[0] !== 'function') {
      if (typeof args[0] === 'string') {
        key = args[0]
      }

      actionHandlers = args.slice(1)
    }

    var initial = actionHandlers.find((h) => h[$$initial]) || (() => ({}))
    actionHandlers = actionHandlers.filter((h) => !h[$$initial])

    return (state, action) => {
      let parentState
      if (key) {
        parentState = state
        state = state[key]
      }

      if (state === undefined) {
        state = initial()
      } else {
        actionHandlers.forEach((actionHandler) => {
          const newState = actionHandler(state, action)
          if (newState !== undefined) {
            state = newState
          }
        })
      }

      if (parentState) {
        return Object.assign({ }, parentState, { [key]: state })
      } else {
        return state
      }
    }
  }
}

export default Action
