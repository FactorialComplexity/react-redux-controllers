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

function createSelectorMapper (controller, path, assigner) {
  let prevState, mappedState

  return (state, nextProps) => {
    // Optimization: do not do any mapping if nothing has changed in
    // controller state tree
    if (controller.hasChanges(prevState, state)) {
      prevState = state
      mappedState = controller.$(state, path)
    }

    assigner(nextProps, mappedState)
  }
}

function getAllDispatches (controller) {
  const dispatches = { }
  controller.getAllDispatchKeys().forEach((dispatchKey) => {
    dispatches[strippedDispatchKey(dispatchKey)] = controller[dispatchKey].bind(controller)
  })
  return dispatches
}

function createFullControllerMapper (controller, assigner) {
  const dispatches = getAllDispatches(controller)
  let prevState, mappedState

  return (state, nextProps) => {
    // Optimization: do not do any mapping if nothing has changed in
    // controller state tree
    if (controller.hasChanges(prevState, state)) {
      prevState = state
      mappedState = Object.assign({ }, controller.$(state), dispatches)
    }

    assigner(nextProps, mappedState)
  }
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
  const mappers = []

  for (let i = 0; i < mappings.length; ++i) {
    const m = mappings[i]

    if (m.onlyDispatch || m.onlySelect) {
      // then path should contain a controller
      const controllerPath = m.path.join('.')
      const controller = getController(m.path.join('.'))
      if (!controller) {
        warning(
          `Controller is expected at path ${controllerPath} because it is ` +
          `required by '${controllerPath}.` +
          `${m.onlyDispatch ? 'dispatch*' : 'select*'}' mapping ` +
          `for ${contextString}.`
        )
        continue
      }

      if (m.onlyDispatch) {
        mappers.push((state, nextProps) => {
          m.assigner(nextProps, getAllDispatches(controller))
        })
      } else {
        mappers.push(createSelectorMapper(controller, [], m.assigner))
      }
    } else {
      // Check for the last controller at the path if any
      let controller
      for (let j = m.path.length - 1; j >= 0; --j) {
        const controllerPath = m.path.slice(0, j + 1).join('.')
        controller = getController(controllerPath)

        if (controller) {
          if (j === m.path.length - 1) {
            mappers.push(createFullControllerMapper(controller, m.assigner))
            break
          } else {
            const dispatchKey = tryPropertyAsDispatch(controller, m.path[j + 1])
            if (dispatchKey) {
              // Mapping a dispatch function
              let dispatch = controller[dispatchKey]

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

              dispatch = dispatch.bind(controller)
              mappers.push((state, nextProps) => m.assigner(nextProps, dispatch))
              break
            }
          }

          mappers.push(createSelectorMapper(controller, m.path.slice(j + 1), m.assigner))
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

          mappers.push((state, nextProps) => {
            const subState = getSubState(state, m.path)
            const subStateChanged = subState !== getSubState(prevState, m.path)

            const hasChangedControllerStates = prevState &&
              !!(controllersAtPath.find(({ controller }) =>
                controller.hasChanges(prevState, state)))

            if (!subStateChanged && !hasChangedControllerStates) {
              m.assigner(nextProps, prevMappedState)
            } else {
              let mappedState = Object.assign({ }, getSubState(state, m.path))

              controllersAtPath.forEach(({ subPath, controller }) => {
                assignToPath(mappedState, controller.$(state), subPath)
              })

              m.assigner(nextProps, mappedState)

              prevState = state
              prevMappedState = mappedState
            }
          })
        } else {
          // Plain state without controllers
          mappers.push((state, nextProps) => {
            m.assigner(nextProps, getSubState(state, m.path))
          })
        }
      }
    }
  }

  return (state, props) => {
    const nextProps = Object.assign({ }, props)
    mappers.forEach((mapper) => mapper(state, nextProps))
    return nextProps
  }
}
