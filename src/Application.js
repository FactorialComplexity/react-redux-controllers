import React, { Component } from 'react'
import { Provider } from 'react-redux'
import { createStore, applyMiddleware, combineReducers, compose } from 'redux'
import thunkMiddleware from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { persistStore, autoRehydrate } from 'redux-persist'

import { applicationShape } from './with'

const _controllers = Symbol('controllers');
const _store = Symbol('store');
const _options = Symbol('options');
const _controllerName = Symbol('controllerName');

const CONTROLLER_SUFFIX = 'Controller';

export default class Application {
    constructor(options) {
        this[_controllers] = { };
        this[_options] = Object.assign({
            noPersistance: false
        }, options);
    }

    get store() {
        return this[_store];
    }

    register(controller, ...args) {
        let cls, name;

        if (typeof controller === 'function') {
            cls = controller;
            name = controller.controllerName;

            if (!name) {
                name = cls.name;
                if (name.endsWith(CONTROLLER_SUFFIX) && name.length > CONTROLLER_SUFFIX.length) {
                    name = name.substring(0, name.length - CONTROLLER_SUFFIX.length);
                }
            }
        } else if (controller && controller.cls) {
            cls = controller.cls;
            name = controller.name;
        } else {
            throw new Error('Invalid controller specified');
        }

        const instance = new cls(...[this, [name]].concat(args));
        if (this[_controllers][name]) {
            console.log('WARNING: Controller for name "' + name + '" was already registered, overwriting');
        }
        instance[_controllerName] = name;

        this[_controllers][name] = instance;
    }

    getController(name) {
        let controller = this[_controllers][name];
        if (!controller && !name.endsWith(CONTROLLER_SUFFIX)) {
            controller = this[_controllers][name + CONTROLLER_SUFFIX];
        }
        return controller;
    }

    getControllerName(controller) {
        return controller[_controllerName];
    }

    run(starterComponent, splashScreenComponent) {
        const usePersistStore = persistStore && !this[_options].noPersistance;
        
        let rootComponent;

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

        const loggerMiddleware = createLogger ? createLogger() : undefined
        this[_store] = createStore(
            hasReducers ? combineReducers(reducers) : () => ({ }),
            {},
            compose(...[
                usePersistStore ? autoRehydrate({
                    log: true
                }) : undefined,
                applyMiddleware(...[
                    thunkMiddleware,
                    loggerMiddleware
                ].filter((func) => func !== undefined))
            ].filter((func) => func !== undefined))
        )

        var isStoreLoaded = !usePersistStore;
        function setIsStoreLoaded(loaded) {
            isStoreLoaded = loaded;
            if (rootComponent) {
                rootComponent.setState({
                    isStoreLoaded: isStoreLoaded
                });
            }
        }
        
        if (usePersistStore) {
            persistStore(this[_store], {storage: this[_options].persistStorage},  () => {
                console.log('Store rehydration complete');

                for (const controllerKey in this[_controllers]) { // eslint-disable-line guard-for-in
                    const controller = this[_controllers][controllerKey];
                    controller.afterRehydrate();
                }

                setIsStoreLoaded(true);
            });
        }
        
        for (const controllerKey in this[_controllers]) { // eslint-disable-line guard-for-in
            const controller = this[_controllers][controllerKey];
            controller.beforeRun();
        }

        const application = this;
        class ApplicationRoot extends Component {
            constructor(props) {
                super(props);

                this.state = {
                    isStoreLoaded: isStoreLoaded
                };
            }

            getChildContext() {
                return {
                    application: application
                };
            }

            render() {
                return <Provider store={this.props.store}>
                    {this.state.isStoreLoaded ? starterComponent : splashScreenComponent}
                </Provider>;
            }
        }
        
        ApplicationRoot.childContextTypes = {
            application: applicationShape
        };

        return <ApplicationRoot
            ref={(ref) => rootComponent=ref}
            store={this.store}
        />;
    }
}
