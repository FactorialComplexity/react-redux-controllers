import warning from '../utils/warning'
import { toLowerCaseFirst, toUpperCaseFirst } from '../utils/toCaseFirst'

function strippedDispatchKey (dispatchKey) {
  let stripped = dispatchKey.replace(/^dispatch/, '')
  stripped = toLowerCaseFirst(stripped)
  return stripped
}

function getSubState (state, path) {
  return path.reduce((prevState, key) => prevState ? prevState[key] : undefined, state)
}

function assignToPath (state, value, path) {
  path.forEach((component, index) => {
    if (index !== path.length - 1) {
      if (!state[component]) {
        state[component] = { }
      }

      state = state[component]
    } else {
      state[component] = value
    }
  })
}

function assignToProps (nextProps, mappedState, prop) {
  if (prop === '*') {
    Object.assign(nextProps, mappedState)
  } else {
    nextProps[prop] = mappedState
  }
}

function createSelector (controller, path, prop) {
  let prevState, mappedState

  return function (state, nextProps) {
    const $$state = controller.$$(state)

    // Optimization: do not do any mapping if nothing has changed in
    // controller state tree
    if (!controller.areStatesEqual(prevState, $$state)) {
      prevState = $$state
      mappedState = controller.$(state, path)
    }

    if (prop === '*') {
      Object.assign(nextProps, mappedState)
    } else {
      nextProps[prop] = mappedState
    }
  }
}

function resolveAllDispatches (controller, prop, dispatches) {
  const assignTo = prop === '*' ? dispatches : { }
  if (prop !== '*') {
    dispatches[prop] = assignTo
  }

  controller.getAllDispatchKeys().forEach((dispatchKey) => {
    assignTo[strippedDispatchKey(dispatchKey)] =
        controller[dispatchKey].bind(controller)
  })
}

/**
  Checks `propName` for being a dispatch name. Returns the actual name of the `controller` key
  if it is, otherwise returns undefined.
*/
function tryPropertyAsDispatch (controller, propName) {
  if (/^dispatch./.test(propName)) {
    return propName
  }

  propName = `dispatch${toUpperCaseFirst(propName)}`
  if (typeof controller[propName] === 'function') {
    return propName
  }
}

export default function createMapper (getController, mappings, contextString) {
  const dispatches = {}
  const selectors = []

  for (let i = 0; i < mappings.length; ++i) {
    const m = mappings[i]

    if (m.dispatchAll || m.onlySelect) {
      // then path should contain a controller
      const controllerPath = m.path.join('.')
      const controller = getController(m.path.join('.'))
      if (!controller) {
        warning(
          `Controller is expected at path ${controllerPath} because it is ` +
          `required by '${controllerPath}.` +
          `${m.dispatchAll ? 'dispatch*' : 'select*'}' mapping ` +
          `for ${contextString}.`
        )
        continue
      }

      if (m.dispatchAll) {
        resolveAllDispatches(controller, m.prop, dispatches)
      } else {
        selectors.push(createSelector(controller, [], m.prop))
      }
    } else {
      // Check for the last controller at the path if any
      let controller
      for (let j = m.path.length - 1; j >= 0; --j) {
        const controllerPath = m.path.slice(0, j + 1).join('.')
        controller = getController(controllerPath)

        if (controller) {
          if (j === m.path.length - 1) {
            resolveAllDispatches(controller, m.prop, dispatches)
          } else {
            const dispatchKey = tryPropertyAsDispatch(controller, m.path[j + 1])
            if (dispatchKey) {
              // Mapping a dispatch function
              const dispatch = controller[dispatchKey]

              if (typeof dispatch !== 'function') {
                warning(
                  `Function not found at path ${m.path.join('.')}`
                )
                break
              }

              if ((j + 1) !== (m.path.length - 1)) {
                warning(
                  `Mapping dispatch function sub key is not supported. ` +
                  `Path: ${m.path.join('.')}`
                )
                break
              }

              dispatches[m.prop] = dispatch.bind(controller)
              break
            }
          }

          selectors.push(createSelector(controller, m.path.slice(j + 1), m.prop))
          break
        }
      }

      if (!controller) {
        // There is no controller in path, check if there are controllers deeper
        const pathString = m.path.join('.')
        const allControllers = getController()
        const controllersAtPath = []

        for (const mountPathString in allControllers) {
          if (mountPathString.startsWith(pathString + '.')) {
            controllersAtPath.push({
              subPath: allControllers[mountPathString].mountPath.slice(m.path.length),
              controller: allControllers[mountPathString]
            })
          }
        }

        if (controllersAtPath.length > 0) {
          let prevState, prevMappedState

          selectors.push((state, nextProps) => {
            const subState = getSubState(state, m.path)
            const subStateChanged = subState !== getSubState(prevState, m.path)

            const hasChangedControllerStates = prevState &&
              !!(controllersAtPath.find(({ controller }) =>
                !controller.areStatesEqual(controller.$$(state), controller.$$(prevState))))

            if (!subStateChanged && !hasChangedControllerStates) {
              assignToProps(nextProps, prevMappedState, m.prop)
            } else {
              let mappedState = Object.assign({ }, getSubState(state, m.path))

              controllersAtPath.forEach(({ subPath, controller }) => {
                assignToPath(mappedState, controller.$(state), subPath)
              })

              assignToProps(nextProps, mappedState, m.prop)

              prevState = state
              prevMappedState = mappedState
            }
          })
        } else {
          // Plain state without controllers
          selectors.push((state, nextProps) => {
            assignToProps(nextProps, getSubState(state, m.path), m.prop)
          })
        }
      }
    }
  }

  return (state, props) => {
    const nextProps = Object.assign({ }, props, dispatches)
    selectors.forEach((sel) => sel(state, nextProps))

    const dispatchKeys = Object.keys(dispatches)
    for (let i = 0; i < dispatchKeys.length; ++i) {
      const key = dispatchKeys[i]
      const value = dispatches[key]

      if (typeof value === 'function') {
        nextProps[key] = value
      } else {
        nextProps[key] = Object.assign(nextProps[key] || { }, value)
      }
    }

    return nextProps
  }
}
