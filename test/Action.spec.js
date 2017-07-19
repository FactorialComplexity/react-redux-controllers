/* eslint-disable no-console */
import { Action } from '../src'

describe('Action', () => {
  const update = new Action('update')
  
  it('creates a valid data with action() and related methods', () => {
    const data = update.action({ foo: 'bar' })
    expect(data).toEqual({ type: 'update', payload: { foo: 'bar' } })
    
    const error = new Error('unknown error')
    const dataError = update.error(error)
    expect(dataError).toEqual({ type: update.typeError(), payload: error, error: true })
    
    const dataSuccess = update.success({ foo: 'bar' })
    expect(dataSuccess).toEqual({ type: update.typeSuccess(), payload: { foo: 'bar' } })
    
    const dataStarted = update.started({ foo: 'bar' })
    expect(dataStarted).toEqual({ type: update.typeStarted(), payload: { foo: 'bar' } })
  })
  
  it('creates a valid handler with on() method', () => {
    const handler = update.on((state, payload) => {
      return { count: state.count + payload }
    })
    
    expect(handler({ count: 2 }, update.action(2))).toEqual({ count: 4})
  })
  
  it('creates a valid handler with onSuccess() method', () => {
    const handler = update.onSuccess((state, payload) => {
      return { count: state.count + payload }
    })
    
    expect(handler({ count: 2 }, update.success(2))).toEqual({ count: 4})
  })
  
  it('creates a valid handler with onStarted() method', () => {
    const handler = update.onStarted((state, payload) => {
      return { count: state.count + payload }
    })
    
    expect(handler({ count: 2 }, update.started(2))).toEqual({ count: 4 })
  })
  
  it('creates a valid handler with onError() method', () => {
    const handler = update.onError((state, error) => {
      return { error }
    })
    
    expect(handler({ count: 2 }, update.error(new Error('failed'))).error.message)
      .toBe('failed')
  })
  
  it('creates a reducer', () => {
    const updateSub = new Action('updateSub')
    
    const reducer = Action.createReducer(
      Action.initial({
        count: 1
      }),
      
      update.onStarted((state) => {
        return Object.assign({ }, state, { started: true })
      }),
      
      update.onSuccess((state, payload) => {
        return Object.assign({ }, state, { started: false, count: (state.count || 0) + payload })
      }),
      
      update.onError((state, error) => {
        return { error }
      }),
      
      Action.createReducer("sub",
        Action.initial(false),
        
        updateSub.on(() => true)
      )
    )
    
    expect(reducer()).toEqual({ count: 1 })
    
    expect(reducer({ count: 2 }, update.started()))
      .toEqual({ started: true, count: 2, sub: false })
    expect(reducer({ count: 2 }, update.success(2)))
      .toEqual({ started: false, count: 4, sub: false })
    expect(reducer({ count: 2 }, update.error(new Error('failed'))).error.message)
      .toBe('failed')
    
    expect(reducer({ count: 1, sub: false }, updateSub.action()))
      .toEqual({ count: 1, sub: true })
  })
  
  it('creates a reducer with functional initializer', () => {
    const reducer = Action.createReducer(
      Action.initial(() => ({
        count: 1
      }))
    )
    
    expect(reducer()).toEqual({ count: 1 })
  })
})
