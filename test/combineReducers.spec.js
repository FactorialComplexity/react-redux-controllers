/* eslint-disable no-console */
/* eslint-env jest */

import { combineReducers, Controller } from '../src'
import { __controllers } from '../src/combineReducers'

describe('combineReducers', () => {
  it('resolves Controller instances to reducer by calling reducer() and ' +
      'attaches all controllers to Symbol(__controllers) property', () => {
    const controller1 = Object.assign(new Controller(),
      {reducer: jest.fn(() => () => ({}))})
    const controller2 = Object.assign(new Controller(),
      {reducer: jest.fn(() => () => ({}))})

    const reducer = combineReducers({
      controller: controller1,
      nested: combineReducers({
        controller: controller2
      }),
      regularReducer: () => ({ })
    })

    expect(controller1.reducer.mock.calls).toHaveLength(1)
    expect(controller2.reducer.mock.calls).toHaveLength(1)

    expect(reducer[__controllers].controller).toBe(controller1)
    expect(reducer[__controllers].nested.controller).toBe(controller2)
  })

  it('returns a proper composite reducer, made of Controller.reducer()', () => {
    const reducer = combineReducers({
      counter: Object.assign(new Controller(), {
        reducer: () => (state = 0, action) =>
          action.type === 'increment' ? state + 1 : state
      }),
      stack: combineReducers({
        values: Object.assign(new Controller(), {
          reducer: () => (state = [], action) =>
            action.type === 'push' ? [ ...state, action.value ] : state
        })
      })
    })

    const s1 = reducer({}, { type: 'increment' })
    expect(s1).toEqual({ counter: 1, stack: { values: [] } })
    const s2 = reducer(s1, { type: 'push', value: 'a' })
    expect(s2).toEqual({ counter: 1, stack: { values: [ 'a' ] } })
  })
})
