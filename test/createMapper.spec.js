/* eslint-disable no-console */
/* eslint-env jest */

import { createStore, combineReducers } from '../src'
import createMapper from '../src/mapper/createMapper'
import normalizeMappings from '../src/mapper/normalizeMappings'
import shallowEqual from '../src/utils/shallowEqual'
import Controller from '../src/Controller'

describe('createMapper', () => {
  const dispatchBar = jest.fn()
  class MyController extends Controller {
    constructor () {
      super()

      this.createAction('bar')
    }

    $foo (state) {
      return !this.$$(state)._barDispatched ? 'bar' : 'barbar'
    }

    dispatchBar () {
      this.dispatchAction('bar')
      dispatchBar()
    }

    reducer () {
      const { bar } = this.actions
      return this.createReducer(
        bar.on((state) => Object.assign({}, state, { _barDispatched: true }))
      )
    }
  }

  let controller
  let store
  let deepController
  let deepStore

  beforeEach(() => {
    dispatchBar.mockClear()

    controller = new MyController()
    const $foo = controller.$foo.bind(controller)
    controller.$foo = jest.fn((...args) => $foo(...args))

    store = createStore(combineReducers({ controller }), {
      controller: {
        preloaded: 'preloaded value',
        another: 'another preloaded value',
        _barDispatched: false
      }
    })

    deepController = new MyController()
    const $deepFoo = deepController.$foo.bind(deepController)
    deepController.$foo = jest.fn((...args) => $deepFoo(...args))

    deepStore = createStore(combineReducers({
      key1: combineReducers({
        key2: combineReducers({ deepController })
      })
    }), {
      key1: {
        key2: {
          deepController: {
            preloaded: 'preloaded value',
            another: 'another preloaded value',
            _doNotMap: 'value'
          }
        }
      }
    })
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

  it('creates a mapper that supports remapping with custom function', () => {
    const mapper = createMapper(store.getController,
      normalizeMappings([{
        'controller': (nextProps, controller) => {
          nextProps['foo'] = controller
        }
      }]),
      'createMapper.spec')

    const result = mapper(store.getState())

    expect(Object.keys(result.foo)).toHaveLength(4)

    expect(typeof result.foo.bar).toBe('function')
    result.foo.bar()
    expect(dispatchBar).toHaveBeenCalled()

    expect(result.foo.foo).toBe('bar')
    expect(result.foo.preloaded).toBe('preloaded value')
    expect(result.foo.another).toBe('another preloaded value')
  })

  it("creates a mapper that supports remapping only Controller's dispatches", () => {
    const mapper = createMapper(store.getController,
        normalizeMappings([ 'controller.dispatch*', { 'controller.dispatch*': 'kungfu' } ]),
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
        normalizeMappings([ 'controller.select*', { 'controller.$': 'kungfu' } ]),
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

  it('assigns exactly the same object to props if underlying state was not changed', () => {
    const mapper = createMapper(store.getController,
      normalizeMappings(['controller.*']), 'createMapper.spec')

    const result1 = mapper(store.getState())
    expect(controller.$foo).toHaveBeenCalled()
    controller.$foo.mockClear()

    const result2 = mapper(store.getState())

    expect(controller.$foo).not.toHaveBeenCalled()
    expect(shallowEqual(result1, result2)).toBe(true)
    controller.$foo.mockClear()

    result2.bar()

    const result3 = mapper(store.getState())
    expect(controller.$foo).toHaveBeenCalled()
    expect(shallowEqual(result2, result3)).toBe(false)
  })

  it('supports deep mapping of state, calling selectors when required', () => {
    const mapper = createMapper(deepStore.getController,
      normalizeMappings(['key1.*', 'key1.key2.deepController.bar']), 'createMapper.spec')

    const result = mapper(deepStore.getState())

    expect(Object.keys(result.key2.deepController).length).toBe(3)

    expect(result.key2.deepController.foo).toBe('bar')
    expect(result.key2.deepController.preloaded).toBe('preloaded value')
    expect(result.key2.deepController.another).toBe('another preloaded value')
    deepController.$foo.mockClear()

    const result2 = mapper(deepStore.getState())

    expect(deepController.$foo).not.toHaveBeenCalled()
    expect(shallowEqual(result, result2)).toBe(true)
    deepController.$foo.mockClear()

    result2.bar()

    const result3 = mapper(deepStore.getState())

    expect(deepController.$foo).toHaveBeenCalled()
    expect(shallowEqual(result2, result3)).toBe(false)
  })
})
