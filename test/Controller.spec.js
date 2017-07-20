/* eslint-disable no-console */
/* eslint-env jest */

import { createStore, combineReducers, Controller } from '../src'
import { NoOpController } from './helpers/controllers.js'

describe('Controller', () => {
  class ToDoController extends Controller {
    constructor () {
      super()
      this.createAction('add')
    }

    dispatchAdd (text) {
      this.dispatchAction('add', text)
    }

    $texts (state) {
      return (this.$$(state)._items || []).map((item) => item.text)
    }

    reducer () {
      const { add } = this.actions
      return this.createReducer(
        add.on((state, text) => ({
          _items: (state._items || []).concat({ text })
        }))
      )
    }
  }
  
  it('exposes valid public API: mount path, store and Controller.is', () => {
    const controller = new NoOpController()
    const store = createStore(combineReducers({ controller }))

    expect(controller.store).toBe(store)
    expect(controller.dispatch).toBe(store.dispatch)
    expect(controller.mountPath).toEqual(['controller'])
    expect(controller.mountPathString).toEqual('controller')
    expect(Controller.is(controller)).toBe(true)
  })

  it('returns valid part of the state with $$()', () => {
    const controller = new NoOpController()
    const state = {
      nested: {
        controlled: {
          foo: 'bar'
        }
      }
    }

    createStore(combineReducers({
      nested: combineReducers({ controlled: controller })
    }), state)

    expect(controller.$$(state)).toBe(state.nested.controlled)
  })

  it('returns all dispatch methods with getAllDispatchKeys()', () => {
    class MyController extends NoOpController {
      dispatchMe () { }
      dispatchMeAgain () { }

      get dispatchButDoNot () { }
    }

    const controller = new MyController()
    createStore(combineReducers({controller}))

    const dispatchKeys = controller.getAllDispatchKeys()
    expect(dispatchKeys.length).toBe(2)
    expect(dispatchKeys).toContain('dispatchMe')
    expect(dispatchKeys).toContain('dispatchMeAgain')
  })

  it('returns all selector methods with getAllSelectKeys()', () => {
    class MyController extends Controller {
      $selector () { }
      $anotherSelector () { }

      get $notASelector () { }
    }

    const controller = new MyController()

    const selectKeys = controller.getAllSelectKeys()
    expect(selectKeys.length).toBe(2)
    expect(selectKeys).toContain('$selector')
    expect(selectKeys).toContain('$anotherSelector')
  })

  it('returns valid part of the state with $() and ignores _ values', () => {
    const controller = new NoOpController()
    const state = {
      nested: {
        controlled: {
          foo: 'bar',
          sub: {
            hello: 'world'
          },
          _noFoo: 'no bar'
        }
      }
    }

    createStore(combineReducers({
      nested: combineReducers({ controlled: controller })
    }), state)

    const { controlled } = state.nested
    expect(controller.$(state)).toEqual({ foo: 'bar', sub: { hello: 'world' } })
    expect(controller.$(state, 'foo')).toBe(controlled.foo)
    expect(controller.$(state, 'sub')).toEqual({ hello: 'world' })
    expect(controller.$(state, 'sub.hello')).toEqual('world')
  })

  it('calls selectors and forwards the return values when using $()', () => {
    class MyController extends NoOpController {
      $noFoo (state) {
        return this.$$(state)._noFoo
      }

      $sub (state) {
        return {
          subFoo: 'subBar'
        }
      }
    }

    const controller = new MyController()
    const state = {
      nested: {
        controlled: {
          foo: 'bar',
          _noFoo: 'no bar'
        }
      }
    }

    createStore(combineReducers({
      nested: combineReducers({ controlled: controller })
    }), state)

    const { controlled } = state.nested
    expect(controller.$(state)).toEqual({
      foo: 'bar',
      noFoo: 'no bar',
      sub: {
        subFoo: 'subBar'
      }
    })
    expect(controller.$(state, 'noFoo')).toBe(controlled._noFoo)
    expect(controller.$(state, 'sub.subFoo')).toBe('subBar')
  })
  
  it('provides correct wrapper functions for Action functionality', () => {
    const controller = new ToDoController()
    const store = createStore(combineReducers({ todo: controller }))

    controller.dispatchAdd('hello')
    expect(store.getState().todo._items[0].text).toBe('hello')
  })
  
  it('calls listener registered with subscribe() when value at path was changed', () => {
    const controller = new ToDoController()
    createStore(combineReducers({ todo: controller }))
    
    const listener = jest.fn()
    controller.subscribe('texts', listener)

    controller.dispatchAdd('hello')
    
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(['hello'], [])
  })
})
