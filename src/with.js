import React, { Component } from 'react';
import PropTypes from 'prop-types';
import hoistStatics from 'hoist-non-react-statics';

const {shape, func, object} = PropTypes;
export const applicationShape = shape({
    store: object.isRequired,
    getController: func.isRequired
});

function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export function withApplication(WrappedComponent) {
    var WithApplication = React.createClass({
        displayName: 'WithApplication',

        contextTypes: { application: applicationShape },
        propTypes: { application: applicationShape },

        render: function render() {
            var _this = this;
            
            var application = this.props.application || this.context.application;
            var props = Object.assign({}, this.props, { application: application });
            
            return React.createElement(WrappedComponent, props);
        }
    });

    WithApplication.displayName = 'withApplication(' + getDisplayName(WrappedComponent) + ')';
    WithApplication.WrappedComponent = WrappedComponent;

    return hoistStatics(WithApplication, WrappedComponent); 
}

export function withController(WrappedComponent, controllerName, ...otherControllerNames) {
    class WithController extends Component {
        render() {
            var _this = this;
            
            var application = this.props.application || this.context.application;
            var controller = application ? application.getController(controllerName) : undefined;
            var controllers;
            
            if (application) {
                controllers = { };
                controllers[controllerName] = controller;
                
                if (!controller)
                    console.warn('WARNING: Controller "' + controllerName + '" is not registered')
                
                if (otherControllerNames) {
                    for (var otherControllerName of otherControllerNames) {
                        controllers[otherControllerName] = application.getController(otherControllerName);
                        
                        if (!controllers[otherControllerName]) {
                            console.warn('WARNING: Controller "' + otherControllerName + '" is not registered')
                        }
                    }
                }
            }
            
            var props = Object.assign({}, this.props, {
                controller: controller,
                controllers: controllers
            });
            
            return React.createElement(WrappedComponent, props);
        }
    }
    
    
    WithController.contextTypes = { application: applicationShape }
    WithController.propTypes = { application: applicationShape }
    WithController.displayName = 'withController(' + getDisplayName(WrappedComponent) + ')';
    WithController.WrappedComponent = WrappedComponent;

    return hoistStatics(WithController, WrappedComponent); 
}

