/* eslint-disable no-console */
import { createStore, combineReducers, Controller } from '../src'
import { NoOpController } from './helpers/controllers.js'

describe('createStore', () => {
  it('exposes getController() and vanilla createStore() API', () => {
    const store = createStore(combineReducers({ todo: new NoOpController() }))
    const methods = Object.keys(store)

    expect(methods.length).toBe(5)
    expect(methods).toContain('subscribe')
    expect(methods).toContain('dispatch')
    expect(methods).toContain('getState')
    expect(methods).toContain('replaceReducer')
    expect(methods).toContain('getController')
  })
  
  it('returns controller at specified path with getController()', () => {
    const todo = new NoOpController()
    const nestedTodo = new NoOpController()
    const reducers = combineReducers({
      todo,
      nested: combineReducers({
        todo: nestedTodo
      })
    })
    
    const store = createStore(reducers)
    
    expect(store.getController('todo')).toBe(todo)
    expect(store.getController(['todo'])).toBe(todo)
    expect(store.getController('nested.todo')).toBe(nestedTodo)
    expect(store.getController(['nested', 'todo'])).toBe(nestedTodo)
  })
  
  it('calls afterCreateStore() for each mounted Controller with correct mountPath', () => {
    const todo = Object.assign(new NoOpController(), {
      afterCreateStore: jest.fn(() => {
        expect(todo.mountPathString).toBe('todo')
      })
    })
    const nestedTodo = Object.assign(new NoOpController(), {
      afterCreateStore:  jest.fn(() => {
        expect(nestedTodo.mountPathString).toBe('nested.todo')
      })
    })    
    const reducers = combineReducers({
      todo,
      nested: combineReducers({
        todo: nestedTodo
      })
    })
    
    const store = createStore(reducers)
    
    expect(todo.afterCreateStore.mock.calls).toHaveLength(1)
    expect(nestedTodo.afterCreateStore.mock.calls).toHaveLength(1)
  })
})
