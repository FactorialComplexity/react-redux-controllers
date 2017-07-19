import { Controller } from '../../src'

export function id(state = []) {
  return state.reduce((result, item) => (
    item.id > result ? item.id : result
  ), 0) + 1
}

export class NoOpController extends Controller {
  reducer() {
    return (state) => state || { }
  }
}
