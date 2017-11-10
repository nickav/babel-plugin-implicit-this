const babel = require('babel-core')
const plugin = require('../lib')
const { expect } = require('chai')
const transform = code => babel.transform(code, {plugins: [plugin]})

describe('babel-plugin-implicit-this', () => {
  it('Transforms undefined variables', () => {
    expect(transform('console.log(a)')).to.eq('console.log(this.a)')
  })
})
