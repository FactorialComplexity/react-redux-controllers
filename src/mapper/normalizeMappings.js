function isOnlySelect (prop) {
  return prop === 'select*' || prop === '$' || prop === '$*'
}

function spreadPropsAssigner (nextProps, value) {
  Object.assign(nextProps, value)
}

function createMapping (path, prop) {
  let assigner
  let onlyDispatch = false
  let onlySelect = false

  if (prop === '*' || prop === 'dispatch*' || isOnlySelect(prop)) {
    assigner = spreadPropsAssigner
  } else if (typeof prop === 'string') {
    assigner = (nextProps, value) => {
      nextProps[prop] = value
    }
  } else if (typeof prop === 'function') {
    assigner = prop
  } else {
    throw new Error(`Invalid value mapping for path ${path}, ` +
      `mapping to ${prop}, which is not a string or a function`)
  }

  if (path.length > 0 && path[path.length - 1] === 'dispatch*') {
    path = path.slice(0, path.length - 1)
    onlyDispatch = true
  } else if (path.length > 0 && (isOnlySelect(path[path.length - 1]))) {
    path = path.slice(0, path.length - 1)
    onlySelect = true
  }

  return {
    path,
    assigner,
    onlyDispatch,
    onlySelect
  }
}

export default function normalizeMappings (mappings) {
  let normalized = []

  // Flatten and remove trailing ".*"
  for (let i = 0; i < mappings.length; ++i) {
    if (typeof mappings[i] === 'string') {
      const splitPath = mappings[i].split('.').filter((e) => e.length > 0)
      let prop = splitPath[splitPath.length - 1]
      if (/^dispatch./.test(prop)) {
        prop = prop.substr('dispatch'.length, 1).toLowerCase() +
          prop.substr('dispatch'.length + 1)
      }

      normalized.push(createMapping(
        splitPath[splitPath.length - 1] === '*'
          ? splitPath.slice(0, splitPath.length - 1) : splitPath,
        prop
      ))
    } else {
      normalized = normalized.concat(Object.keys(mappings[i]).map((key) => createMapping(
        key.split('.').filter((e, i, a) => e.length > 0 && (e !== '*' || i !== a.length - 1)),
        mappings[i][key]
      )))
    }
  }

  return normalized
}
