# React/Redux Controllers

*IMPORTANT: The library is in **alpha** version and API might change drastically. Use with caution.* 

*NOTE: This document assumes the reader is familiar with [Redux](http://redux.js.org/) and [React](https://facebook.github.io/react/)*.

This microframework was created for organizing the code of React/Redux applications. It is important to understand that it *does not* introduce any new fundamental concepts to a regular React/Redux application *internals*. It provides the utilities for structuring React/Redux application in a way, that make them more readable and manageable. The main goal is to reduce the boilerplate code introduced by Redux.

This is achieved by three essential primitives:

- **Controller**
- **Container**
- **Application**

And one small, but important utility class:

- **Action**

*NOTE:* Actions in fact can be used in any Redux application separately from the rest of the framework. Action class itself has zero dependencies.


### Installation

The library is available as a package on NPM:

```
npm install --save react-redux-controllers
```


## Controller

As the name of the library implies, the central concept here is **Controller**. However, this is *not* a controller as in MVC (although, admittedly it does share certain similarities, hence the name). It is better to think of it as a "data controller", responsible for managing the certain part of the application **state**. "Managing" includes:

- *Sending* relevant **actions** in response to certain related events
- *Modifying* the state by providing the relevant **reducer**
- *Providing access* and if necessary *transforming* the data in the managed part of the **state**

Here is a quick example with explanation to kick things off. Most application require certain kind of user authentication (e.g. email/password login). Our **AuthenticationController** will contain the logic.

```javascript
import { Controller, Action } from "react-redux-controllers";

// Each controller is a class, that subclasses Controller
class AuthenticationController extends Controller {
  
  // These two parameters are required and handled by the library
  // You can pass your own parameters
  constructor(application, mountPath) {
    super(application, mountPath);
    
    // Create an action called "login" in the context of our controller
    this.createAction("login");
  }
  
  // This function can be used to initiate login from anywhere
  // (mostly from view-layer of course)
  login(email, password, dispatch) {
    const { login } = this.actions;
    
    dispatch(login.started());
    dispatch(() => {
      // do actual login with email and password...
      // ...and on sucess call
      dispatch(login.success(user));
    });
  }
  
  // Here we create reducer, using handy utility class Action
  reducer() {
    return Action.createReducer(
      login.onStarted((state) => Object.assign({}, state, {
        isLoggingIn: true
      }),
      
      login.onSuccess((state, user) => Object.assign({}, state, {
        isLoggingIn: false,
        user
      })
    );
  }
  
  // And finally here are accessors to the relevant information in state
  isLoggingIn(state) {
    // The state here is a global state. In order to access the part managed by the
    // controller we use this.$(), which is just a shortcut to this.rootState()
    return this.$(state).isLoggingIn;
  }
  
  // ...here we just return the data, but this is a good place to do any work
  // in order to transform data from implementation detailed storage structure
  // into some meaningful interface
  getUser(state) {
    return this.$(state).user;
  }
  
  // We need controllers to have names in order to reference them from elsewhere.
  // As most people minify their JavaScript code, it is unfortunately a neccessity
  // to specify the name explicitly VS extracting it from the class name :( 
  static get name() {
    return "Authentication";
  }
}

```

In this example we don't process errors, but I think you can already imagine how this can be done.


## Container

Controllers encapsulate all the data processing logic, but it is up to **Containers** to connect it to the view layer. This is what you would use in place of `connect()` in traditional Redux application. And in fact `Container()` calls it internally. However, instead of requiring to write the boring *mapToState* and *mapToDispatch* stuff, we will just connect it to the Controller referenced by name.

```javascript
import { Container } from "react-redux-controllers";

class Login extends Component {
  // ...
}

export default Container(Login, "Authentication");
```

Behind the scene this does some automatic **props** mapping. Specifically for the *AuthenticationController* we have created above the container will receive and propagate the following props:

- **login** - mapped as a function, `dispatch` will be automatically passed as the last argument
- **isLoggingIn** - mapped as the value, by calling `isLoggingIn()` function of the controller
- **user** - mapped as the value, by calling `getUser()` function of the controller

They mapped using certain simple conventions. If the results do not satisfy you in certain specific cases, you can alter them in either Controller or Container. This of course will kill the magic, but sometimes it is necessary.

## Application

The **Application** has two responsibilities:

- Initializing the Redux store and launching the React application *(this most likely will not be the case in final version though)*
- Acting as a repository for the **Controllers**

The base Application class from this package is React-agnostic (can be used with both DOM and Native). There are 2 supplementary packages, which provide ready-to-use Application subclasses:

- [react-redux-controllers-dom](https://gitlab.f17y.com/open-source-react/react-redux-controllers-dom)
- [react-redux-controllers-native](https://gitlab.f17y.com/open-source-react/react-redux-controllers-native)

Here is an initialization example:

```javascript
import { Application } from "react-redux-controllers-dom";

// ...

const app = new Application();
app.register(AuthController);
app.run(document.getElementById('root'), <Login />);
```

You might want to subclass Application even further, if you follow OOP-style. For example, Application subclass would be a good place to initialize some kind of Web API client you will be using. It can be then exposed as a property. Each Controller can access its Application via the `application` property.

