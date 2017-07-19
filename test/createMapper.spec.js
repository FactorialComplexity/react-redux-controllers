/* eslint-disable no-console */
import { createStore, combineReducers } from '../src'
import createMapper from '../src/mapper/createMapper'
import normalizeMappings from '../src/mapper/normalizeMappings'
import { NoOpController } from './helpers/controllers.js'

describe('createMapper', () => {
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
      another: 'another preloaded value',
      _doNotMap: 'value'
    }
  })
  
  beforeEach(() => {
    dispatchBar.mockClear()
  })
  
  it('creates a mapper that maps controller dispatches, selectors and direct values from store', () => {
    const mapper = createMapper(store.getController,
      normalizeMappings(['controller.*']), 'createMapper.spec')
    
    const result = mapper(store.getState())
    
    expect(Object.keys(result).length).toBe(4)
      
    expect(typeof result.bar).toBe('function')
    result.bar()
    expect(dispatchBar).toHaveBeenCalled()

    expect(result.foo).toBe('bar')
    expect(result.preloaded).toBe('preloaded value')
    expect(result.another).toBe('another preloaded value')
  })
  
  it('creates a mapper that maps Controller as subproperty, if * and propname is not specified', () => {
    const mapper = createMapper(store.getController,
      normalizeMappings(['controller']), 'createMapper.spec')
    
    const result = mapper(store.getState())
    
    expect(Object.keys(result.controller).length).toBe(4)
      
    expect(typeof result.controller.bar).toBe('function')
    result.controller.bar()
    expect(dispatchBar).toHaveBeenCalled()

    expect(result.controller.foo).toBe('bar')
    expect(result.controller.preloaded).toBe('preloaded value')
    expect(result.controller.another).toBe('another preloaded value')
  })
  
  it('creates a mapper that maps separate selectors and dispatches', () => {
    const mapper = createMapper(store.getController,
        normalizeMappings(['controller.foo', 'controller.preloaded', 'controller.dispatchBar']),
        'createMapper.spec')
      
    const result = mapper(store.getState())
    
    expect(Object.keys(result).length).toBe(3)
      
    expect(typeof result.bar).toBe('function')
    result.bar()
    expect(dispatchBar).toHaveBeenCalled()
    
    expect(result.foo).toBe('bar')
    expect(result.preloaded).toBe('preloaded value')
  })

  it('creates a mapper that supports short names for dispatches', () => {
    const mapper = createMapper(store.getController,
        normalizeMappings(['controller.bar']),
        'createMapper.spec')
      
    const result = mapper(store.getState())
      
    expect(typeof result.bar).toBe('function')
    result.bar()
    expect(dispatchBar).toHaveBeenCalled()
  })

  it('creates a mapper that supports remapping properties', () => {
    const mapper = createMapper(store.getController,
        normalizeMappings([{ 'controller.foo': 'kungfu' }, 'controller.preloaded']),
        'createMapper.spec')

    const result = mapper(store.getState())

    expect(result.kungfu).toBe('bar')
    expect(result.preloaded).toBe('preloaded value')
  })

  it("creates a mapper that supports remapping all Controller's properties", () => {
    const mapper = createMapper(store.getController,
        normalizeMappings([{ 'controller': 'kungfu', 'controller.*': 'asterisk' }]),
        'createMapper.spec')

    const result = mapper(store.getState())
    
    expect(typeof result.kungfu.bar).toBe('function')
    result.kungfu.bar()
    result.asterisk.bar()
    expect(dispatchBar).toHaveBeenCalledTimes(2)
    
    expect(result.kungfu.foo).toBe('bar')
    expect(result.asterisk.foo).toBe('bar')
    
    expect(result.kungfu.preloaded).toBe('preloaded value')
    expect(result.asterisk.preloaded).toBe('preloaded value')
    
    expect(result.kungfu.another).toBe('another preloaded value')
    expect(result.asterisk.another).toBe('another preloaded value')
  })
  
  it("creates a mapper that supports remapping only Controller's dispatches", () => {
    const mapper = createMapper(store.getController,
        normalizeMappings([ 'controller.dispatch*', { 'controller.dispatch*': 'kungfu' }]),
        'createMapper.spec')

    const result = mapper(store.getState())
    
    result.bar()
    result.kungfu.bar()
    expect(dispatchBar).toHaveBeenCalledTimes(2)
    
    expect(Object.keys(result).length).toBe(2)
    expect(Object.keys(result.kungfu).length).toBe(1)
  })
  
  it("creates a mapper that supports remapping only Controller's selectors", () => {
    const mapper = createMapper(store.getController,
        normalizeMappings([ 'controller.select*', { 'controller.$': 'kungfu' }]),
        'createMapper.spec')

    const result = mapper(store.getState())
    
    expect(result.kungfu.foo).toBe('bar')
    expect(result.foo).toBe('bar')
    
    expect(result.kungfu.preloaded).toBe('preloaded value')
    expect(result.preloaded).toBe('preloaded value')
    
    expect(result.kungfu.another).toBe('another preloaded value')
    expect(result.another).toBe('another preloaded value')
    
    expect(Object.keys(result).length).toBe(4)
    expect(Object.keys(result.kungfu).length).toBe(3)
  })
})
