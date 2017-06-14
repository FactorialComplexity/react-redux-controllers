import { createStore as createStoreVanilla } from 'redux';
import { __controllers } from './combineReducers';
import Controller, {
  __store,
  __mountPath,
  __mountPathString
} from './Controller';

/**
 * Wrapper around vanilla `createStore()` from `redux` package. Creates the
 * regular Redux store and extends it with `getController()` function.
 */
export default function createStore(reducers, preloadedState, enhancer) {
  const store = createStoreVanilla(reducers, preloadedState, enhancer);
  
  // Extract controller from reducers function property and
  // flatten them for path-based look up
  function _flattenControllers(thisControllers, thisPath) {
    const result = { };
    
    const controllerKeys = Object.keys(thisControllers);
    for (let i = 0; i < controllerKeys.length; ++i) {
      const key = controllerKeys[i];

      if (Controller.is(thisControllers[key])) {
        // Assume this is a Controller
        const controller = thisControllers[key];
        const mountPath = thisPath.concat(key);
        const mountPathString = mountPath.join('.');
        
        controller[__store] = store;
        controller[__mountPath] = mountPath;
        controller[__mountPathString] = mountPathString;
        
        result[mountPathString] = thisControllers[key];
        
      } else {
        // Object with more nested controllers
        Object.assign(result,
            _flattenControllers(thisControllers[key], thisPath.concat(key))); 
      }
    }
    
    return result;
  }
  
  const controllersByPathString = reducers[__controllers] ?
      _flattenControllers(reducers[__controllers], []) :
      { };
  
  const controllersArray = Object.keys(controllersByPathString)
      .map(key => controllersByPathString[key]);
  
  function getController(path) {
    return controllersByPathString[path];
  }
  
  Object.assign(store, {
    getController
  });
  
  // Call Controller.afterCreateStore() hook
  for (let i=0; i<controllersArray.length; ++i) {
    controllersArray[i].afterCreateStore();
  }
  
  return store;
}
