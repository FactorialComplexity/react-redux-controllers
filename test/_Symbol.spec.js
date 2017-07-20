/* eslint-disable no-console */
/* eslint-env jest */

import _Symbol from '../src/utils/_Symbol'

describe('_Symbol', () => {
  it('returns unique string based on label when Symbol is missing in runtime environment', () => {
    Symbol = undefined // eslint-disable-line no-global-assign

    const symbol = _Symbol('test')
    expect(typeof symbol).toBe('string')

    const anotherSymbol = _Symbol('test2')
    expect(typeof anotherSymbol).toBe('string')

    expect(symbol).not.toEqual(anotherSymbol)
  })
})
