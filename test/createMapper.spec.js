/* eslint-disable no-console */
import { createStore, combineReducers } from '../src'
import createMapper from '../src/mapper/createMapper'
import normalizeMappings from '../src/mapper/normalizeMappings'
import { NoOpController } from './helpers/controllers.js'

describe('createMapper', () => {
  it('creates a mapper that maps controller dispatches, selectors and direct values from store', () => {
    const dispatchBar = jest.fn()
    class MyController extends NoOpController {
      $foo(state) {
        return 'bar'
      }
      
      dispatchBar() { dispatchBar() }
    }
    
    const controller = new MyController()
    const store = createStore(combineReducers({ controller }), {
      controller: {
        preloaded: 'preloaded value',
        _doNotMap: 'value'
      }
    })

    const mapper = createMapper(store.getController,
      normalizeMappings(['controller.*']), 'createMapper.spec')
    
    expect(typeof mapper.dispatches.bar === 'function')
    mapper.dispatches.bar()
      
    expect(dispatchBar).toHaveBeenCalled()
    
    const nextResult = { }
    mapper.selectors.forEach((sel) => sel(store.getState(), nextResult));
    
    expect(Object.keys(nextResult).length).toBe(2)
    expect(nextResult.foo).toBe('bar')
    expect(nextResult.preloaded).toBe('preloaded value')
  })
})
