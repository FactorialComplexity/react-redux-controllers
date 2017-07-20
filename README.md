# React/Redux Controllers

*NOTE: This guide assumes the reader is familiar with [Redux](http://redux.js.org/) and [React](https://facebook.github.io/react/)*.

This microframework was created for organizing the code of React/Redux applications. It is important to understand that it *does not* introduce any new fundamental concepts to how regular React/Redux application *works*. The goal is to provide the utilities for structuring React/Redux code in a way, that makes it more readable, manageable and reusable.

This is achieved by two essential primitives:

- **[Controller](#Controller)**
- **[Container](#Container)**

And one small, but important utility class:

- **[Action](https://factorialcomplexity.github.io/react-redux-controllers/Action.html)**

*NOTE: [Action](https://factorialcomplexity.github.io/react-redux-controllers/Action.html) in fact can be used in any Redux application separately from the rest of the framework. Action class itself has zero dependencies.*


### Installation

The library is available as a package on NPM:

```
npm install --save react-redux-controllers
```

### Usage

In order to make it work you need to replace Redux versions of [createStore()](http://redux.js.org/docs/api/createStore.html) and [combineReducers()](http://redux.js.org/docs/api/combineReducers.html) with ones provided by current package. I.e. basically replace :

```javascript
import { createStore, combineReducers } from 'redux'
```

With:

```javascript
import { createStore, combineReducers } from 'react-redux-controllers'
```

*NOTE: If you use require() modify the code above accordingly.*

Any regular Redux code will continue to work. These functions call their vanilla Redux counterparts under the hood. They do exactly the same, unless you start passing Controller instances into combineReducers() additionally to regular reducers.


### Full API Documentation

- [Controller](https://factorialcomplexity.github.io/react-redux-controllers/Controller.html)
- [Container](https://factorialcomplexity.github.io/react-redux-controllers/global.html#Container)
- [Action](https://factorialcomplexity.github.io/react-redux-controllers/Action.html)

<a name="Controller"></a>
## Controller

As the name of the library implies, the central concept is **Controller**. However, this is *not* a controller as in MVC. It is better to think of it as a "data controller", responsible for managing the certain part of the application **state**. This includes:

- *Sending* relevant **actions** in response to certain related events.
- *Modifying* the state by providing the relevant **reducer**.
- *Providing access* and if necessary *transforming* the data in the managed part of the **state**.

Developers utilize controllers by subclassing the [Controller](https://factorialcomplexity.github.io/react-redux-controllers/Controller.html) class provided by the framework. Instances of the Controller subclasses should then be mounted into the Redux store. This is done by passing them to [combineReducers()](https://factorialcomplexity.github.io/react-redux-controllers/global.html#combineReducers) in place of regular reducer functions.

```
const reducer = combineReducers({
  todo: new ToDoController()
})
```

<a name="Container"></a>
## Container

Controllers encapsulate all the data processing logic, but it is up to **Containers** to connect it to the view layer. This is what you [connect()](https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options) for in traditional Redux application. And in fact [Container()](https://factorialcomplexity.github.io/react-redux-controllers/global.html#Container) calls it under the hood. However, instead of requiring to write the boring *mapToState* and *mapToDispatch* stuff, we will just connect it to the Controller referenced by path where it was mounted.

```jsx 
import { Container } from 'react-redux-controllers'

class ToDo extends Component {
  // ...
}

export default Container(ToDo, "todo.*");
```

Behind the scene this automatically maps the whole portion of state tree at `state.todo` to the props of the exported component. However, there are couple of twists that make this more fun:

- Any method in Controller which starts with `$` is considered to be a "selector". It is called whenever the relevant part of the state needs to be mapped: either by Container or with [Controller.$()](https://factorialcomplexity.github.io/react-redux-controllers/Controller.html#$) function.
- Keys in the state that go immediately below the Controller's level can be marked "private" by prepending them with underscore (`_`). These keys are explicitly ignored by both Container and [Controller.$()](https://factorialcomplexity.github.io/react-redux-controllers/Controller.html#$) function.
- Any method in Controller which start with `dispatch` is considered to be a "dispatch" method. It can be automatically mapped to the props by Container.

Containers allow a lot of options for controlling what is mapped where. The details can be found in [API documentation](https://factorialcomplexity.github.io/react-redux-controllers/global.html#Container). Good practive however is to place all of the selector logic into Controller with minimal remapping in Containers.

## Example

Here is a quick example of the simple controller to show framework in action.

```javascript
import { Controller } from 'react-redux-controllers'

class ToDoController extends Controller {
  constructor() {
    super()
    
    // Create new Action and save it into this.actions.add
    this.createAction('add')
  }
  
  // Provides reducer to be used by store
  reducer() {
    const { add } = this.actions
    
    // this.createReducer is just a shortcut to Action.createReducer,
    // so you do not have to import Action
    return this.createReducer(
      add.on((state, text) => ({
        _items: (state._items || []).concat({ text })
      }))
    )
  }

  // Dispatch function. Will be mapped as `add(text)` in Container
  dispatchAdd(text) {
    this.dispatchAction('add', text)
  }

  // Selector function. Will be used to collect data for `props.text` in Container
  $texts(state) {
    return (this.$$(state)._items || []).map((item) => item.text)
  }
}

```

The component that works with the controller can look this way:

```jsx 
import { Container } from 'react-redux-controllers'

class ToDo extends Component {
  render() {
    const { texts, add } = this.props
    
    return (
      <ul>
        {texts.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
      <button onclick={add("Do something!")}>
        Add
      </button>
    )
  }
}

export default Container(ToDo, "todo.*");
```
