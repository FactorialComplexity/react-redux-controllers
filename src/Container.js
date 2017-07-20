import { connectAdvanced } from 'react-redux'
import shallowEqual from './utils/shallowEqual'
import withMapper from './mapper/withMapper'
import warning from './utils/warning'

/**
 * Connects a React component to a Redux store. Additionally to regular `connect()` method
 * Container supports an extensive mapping functionality designed to work nice with
 * [Controllers]{@link Controller}.
 *
 * Container is capable of mapping any part of a Redux state tree to the props of the
 * wrapped component. When mapping parts of the tree managed by [controllers]{@link Controller},
 * Container calls [Controller.$]{@link Controller#$} method to select the data, thus calling
 * any selector methods defined on the Controller level.
 *
 * If mapping the path exactly equal to
 * [Controller.mountPathString]{@link Controller#mountPathString}, dispatch functions are also
 * mapped by default.
 *
 * The list of mapping options:
 *
 * | Mapping | Description | Result |
 * | --- | --- | --- |
 * | `"path.*"` | Map all sub-keys at `path` to `props`. | `path.key1` to `props.key1`<br>`path.key2` to `props.key2` ... |
 * | `{ "path": "*" }` | Same as `"path.*"` | |
 * | `"path.key"` | Map the path to the prop that equal to the last key in the path. | `path.key` to `props.key` |
 * | `{ "path.key": "remapKey" }` | Map the path to the prop that is explicitly specified. | `path.key` to `props.remapKey` |
 * | `"path.dispatch*"` | Only map dispatch functions of the controller to props. | `path.dispatchFunc1` to `props.func1`<br>`path.dispatchFunc2` to `props.func2` ... |
 * | `{ "path.dispatch*": "*" }` | Same as `"path.dispatch*"` | |
 * | `{ "path.dispatch*": "funcs"}` | Map all dispatch functions of the controller to the specified prop. | `path.dispatchFunc1` to `props.funcs.func1`<br>`auth.dispatchFunc2` to `props.funcs.func2` ... |
 * | `"path.select*"` | Only map state managed by the controller to props (no dispatches). | |
 * | `"path.$"` | Same as `"path.select*"` | |
 * | `{ "path.select*": "*" }` | Same as `"path.select*"` | |
 * | `{ "path.select*": "keys" }` | Only map state managed by the controller to props (no dispatches). | `path.key1` to `props.keys.key1` <br> `path.key2` to `props.keys.key2` ... |
 *
 *
 *
 * @param {React.Component} WrappedComponent Component to connect.
 * @param {string|Object.<string, string>} mappings Any amount of mappings that should be applied
 *   when connecting Redux store to the component.
 *
 */
function Container (WrappedComponent, ...mappings) {
  function factory (dispatch) {
    let result = {}

    return (state, nextOwnProps) => {
      const { mapper } = nextOwnProps
      if (!mapper) {
        warning(`Property 'mapper' expected but not found.`)
        return nextOwnProps
      }

      let nextResult = Object.assign({ }, nextOwnProps)
      delete nextResult.mapper // Do not pass the mapper down

      nextResult = mapper(state, nextResult)

      if (!shallowEqual(result, nextResult)) { result = nextResult }

      return result
    }
  }

  return withMapper(connectAdvanced(factory)(WrappedComponent), ...mappings)
}

export default Container
