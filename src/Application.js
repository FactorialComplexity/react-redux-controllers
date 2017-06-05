import React, { Component } from 'react';
import { createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';

import { applicationShape } from './with'
import { _applicationKey, _mountPathKey, _mountPathStringKey } from './Controller';

const _controllersKey = Symbol('controllers');
const _storeKey = Symbol('store');

export default class Application {
    constructor() {
        this[_controllersKey] = { };
    }

    get store() {
        return this[_storeKey];
    }

    getController(key) {
        return this[_controllersKey][key];
    }
    
    createStore(reducers, preloadedState, enhancer) {
        const _prepareReducers = (reducer, path) => {
            if (typeof reducer === "function") {
                
                // Assume ready to use reducer function
                return reducer;
            
            } else if (reducer && typeof reducer.reducer === "function") {
               
                // Assume this is a Controller
                reducer[_applicationKey] = this;
                
                reducer[_mountPathKey] = path;
                reducer[_mountPathStringKey] = path.join(".");
                
                this[_controllersKey][reducer[_mountPathStringKey]] = reducer;
                return reducer.reducer();
                
            } else if (reducer !== undefined && reducer !== null) {
                
                // Only left to assume that we are dealing with { key: reducer } style object
                // This function pretty much repeats Redux combineReducers, but adds recursiveness
                const reducers = reducer;
                const reducerKeys = Object.keys(reducers);
                const preparedReducers = { };
                for (let i = 0; i < reducerKeys.length; ++i) {
                    const key = reducerKeys[i]
                    preparedReducers[key] = _prepareReducers(reducers[key], path.concat(key));
                }
                
                return preparedReducers;
                
            } else {
                // Something is wrong, but let combineReducers handle this
                return reducer;
            }
        }
        
        let reducer = _prepareReducers(reducers);
        if (typeof reducer !== "function") {
            reducer = combineReducers();
        }
        
        return this[_storeKey] = createStore(
            reducer,
            preloadedState,
            enhancer
        );
    }
    
    mount(component) {
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

        const mounted = <ApplicationRoot store={this.store}>
            {component}
        </ApplicationRoot>;
        
        for (const controllerKey in this[_controllersKey]) { // eslint-disable-line guard-for-in
            const controller = this[_controllersKey][controllerKey];
            controller.controllerDidMount();
        }
        
        return mounted;
    }
}
