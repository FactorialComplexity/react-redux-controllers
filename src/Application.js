import React, { Component } from 'react';
import { createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';

import { applicationShape } from './with'

const _controllers = Symbol('controllers');
const _store = Symbol('store');
const _options = Symbol('options');
const _controllerName = Symbol('controllerName');

export default class Application {
    constructor() {
        this[_controllers] = { };
    }

    get store() {
        return this[_store];
    }

    register(controller, ...args) {
        if (this.store) {
            throw new Error("Cannot register controllers after createStore() was called");
        }
        
        let cls, name;

        if (typeof controller === 'function') {
            cls = controller;
            name = controller.controllerName;

            if (!name) {
                throw new Error(`Name was not specified for ${cls.name}. ` +
                    `Either define controllerName class property, or use .named()`);
            }
        } else if (controller && controller.cls) {
            cls = controller.cls;
            name = controller.name;
        } else {
            throw new Error('Invalid controller. Class expected');
        }

        const instance = new cls(...[this, [name]].concat(args));
        if (this[_controllers][name]) {
            console.log(`WARNING: Controller for name "${name}" was already registered, overwriting`);
        }
        instance[_controllerName] = name;

        this[_controllers][name] = instance;
    }

    getController(name) {
        return this[_controllers][name];
    }

    getControllerName(controller) {
        return controller[_controllerName];
    }
    
    createStore(preloadedState, enhancer) {
        let reducers = { };
        let hasReducers = false;
        for (const controllerKey in this[_controllers]) { // eslint-disable-line guard-for-in
            const controller = this[_controllers][controllerKey];
            const reducer = controller.reducer();
            if (reducer) {
                reducers[controllerKey] = reducer;
                hasReducers = true;
            }
        }
        
        this[_store] = createStore(
            hasReducers ? combineReducers(reducers) : () => ({ }),
            preloadedState,
            enhancer
        );
        
        for (const controllerKey in this[_controllers]) { // eslint-disable-line guard-for-in
            const controller = this[_controllers][controllerKey];
            controller.afterCreateStore();
        }
        
        return this[_store];
    }
    
    wrap(component) {
        const application = this;
        class ApplicationRoot extends Component {
            getChildContext() {
                return {
                    application: application
                };
            }

            render() {
                return <Provider store={this.props.store}>
                    {this.props.children}
                </Provider>;
            }
        }
        
        ApplicationRoot.childContextTypes = {
            application: applicationShape
        };

        return <ApplicationRoot store={this.store}>
            {component}
        </ApplicationRoot>;
    }
}
