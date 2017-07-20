import React, { Component } from 'react'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import createMapper from './createMapper'
import normalizeMappings from './normalizeMappings'

const {shape, func} = PropTypes
export const storeShape = shape({
  subscribe: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  getState: PropTypes.func.isRequired,
  getController: func.isRequired
})

function getDisplayName (WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component'
}

export default function withMapper (WrappedComponent, ...mappings) {
  const normalizedMappings = normalizeMappings(mappings)
  let prevMapper, prevStore

  class WithMapper extends Component {
    render () {
      let mapper = prevMapper
      const store = this.props.store || this.context.store

      if (prevStore !== store) {
        if (store) {
          mapper = createMapper(store.getController, normalizedMappings,
              `Container(${getDisplayName(WrappedComponent)})`)
        }

        prevStore = store
        prevMapper = mapper
      }

      return <WrappedComponent {...this.props} mapper={mapper} />
    }
  }

  Object.assign(WithMapper, {
    contextTypes: {store: storeShape},
    propTypes: {store: storeShape},
    displayName: `withMapper(${getDisplayName(WrappedComponent)})`,
    WrappedComponent: WrappedComponent
  })

  return hoistStatics(WithMapper, WrappedComponent)
}
