import React, { PropTypes } from 'react';
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
    var WithController = React.createClass({
        displayName: 'WithController',

        contextTypes: { application: applicationShape },
        propTypes: { application: applicationShape },

        render: function render() {
            var _this = this;
            
            var application = this.props.application || this.context.application;
            var controller = application ? application.getController(controllerName) : undefined;
            var controllers;
            
            if (application) {
                controllers = { };
                controllers[controllerName] = controller;
                if (otherControllerNames) {
                    for (var otherControllerName of otherControllerNames) {
                        controllers[otherControllerName] = application.getController(controllerName);
                        
                        if (!controllers[otherControllerName]) {
                            console.log('WARNING: Controller ' + otherControllerName + ' is not registered')
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
    });

    WithController.displayName = 'withController(' + getDisplayName(WrappedComponent) + ')';
    WithController.WrappedComponent = WrappedComponent;

    return hoistStatics(WithController, WrappedComponent); 
}

