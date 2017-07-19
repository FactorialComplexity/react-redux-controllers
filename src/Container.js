import { connectAdvanced } from 'react-redux';
import shallowEqual from './utils/shallowEqual';
import withMapper from './mapper/withMapper';
import warning from './utils/warning';

export default function Container(WrappedComponent, ...mappings) {
  function factory(dispatch) {
    let result = {};
    
    return (state, nextOwnProps) => {
      const { mapper } = nextOwnProps;
      if (!mapper) {
        warning(`Property 'mapper' expected but not found.`);
        return nextOwnProps
      }
      
      let nextResult = Object.assign({ }, nextOwnProps);
      delete nextResult.mapper // Do not pass the mapper down
      
      nextResult = mapper(state, nextResult)
      
      if (!shallowEqual(result, nextResult))
        result = nextResult;
      
      return result;
    }
  }
  
  return withMapper(connectAdvanced(factory)(WrappedComponent), ...mappings);
}
