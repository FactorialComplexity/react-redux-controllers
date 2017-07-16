import { Controller } from '../../src'

function id(state = []) {
  return state.reduce((result, item) => (
    item.id > result ? item.id : result
  ), 0) + 1
}

export class ToDoController extends Controller {
  constructor() {
    super()
    this.createAction("add")
  }
  
  dispatchAdd(text) {
    this.dispatchAction("add", { text })
  }
  
  reducer() {
    const { add } = this.actions
    return this.createReducer(
      add.on((state = [], action) => [
        ...state,
        {
          id: id(state),
          text: actionText
        }
      ])
    )
  }
}
