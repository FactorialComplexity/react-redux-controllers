/* eslint-disable no-console */
/* eslint-env jest */

import React from 'react'
import { mount } from 'enzyme'
import { createStore, combineReducers, Container } from '../src'
import { NoOpController } from './helpers/controllers.js'

describe('Container', () => {
  it('maps dispatches and selectors', () => {
    class MyController extends NoOpController {
      $foo (state) {
        return 'bar'
      }

      dispatchBar () { }
    }

    const controller = new MyController()
    const store = createStore(combineReducers({ controller }))

    const TestComponent = () => (<div />)
    const Wrapper = Container(TestComponent, 'controller.*')

    const wrapper = mount(<Wrapper />, { context: { store } })

    // console.log(wrapper.debug())

    expect(wrapper.find(TestComponent).length).toBe(1)

    const wrapped = wrapper.find(TestComponent)

    expect(wrapped.prop('foo')).toBe('bar')
    expect(typeof wrapped.prop('bar') === 'function')
  })

  it('passes own props to wrapped component and custom assigning functions', () => {
    expect.assertions(3)

    const controller = new NoOpController()
    const store = createStore(combineReducers({ controller }))

    const TestComponent = () => (<div />)
    const Wrapper = Container(TestComponent, {
      'controller': (nextProps, value) => {
        expect(nextProps.own).toBe('own foo')
      }
    })

    const wrapper = mount(<Wrapper own='own foo' />, { context: { store } })
    const wrapped = wrapper.find(TestComponent)

    expect(wrapped.prop('own')).toBe('own foo')
  })
})
