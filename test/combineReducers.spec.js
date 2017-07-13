/* eslint-disable no-console */
import { combineReducers, Controller } from '../src';
import { __controllers } from '../src/combineReducers';

describe('combineReducers', () => {
  it('resolves Controller instances to reducer by calling reducer()', () => {
    
    const controller = Object.assign(new Controller(),
        {reducer: jest.fn(() => ({ }))});
    const reducer = combineReducers({
      test: controller
    });
    
    expect(controller.reducer.mock.calls).toHaveLength(1);
  });
});
