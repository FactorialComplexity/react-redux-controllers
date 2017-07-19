import { Controller } from '../../src'

export class NoOpController extends Controller {
  reducer() {
    return (state) => state || { }
  }
}
