const babel = require('babel-core')
const plugin = require('../lib')
const chai = require('chai')
chai.use(require('chai-string'))
const { expect } = chai
const transform = (source, options) =>
  babel.transform(source, { plugins: [[plugin, options]] })

describe('babel-plugin-implicit-this', () => {
  it('transforms undefined variables', () => {
    expect(transform('a;').code).to.eq('this.a;')
  })

  it('should transform basic assignments', () => {
    expect(transform('x = 10;').code).to.eq('this.x = 10;')
  })

  it('should transform member expressions', () => {
    const code = `foo.bar(10);`
    expect(transform(code).code).to.eq(`this.foo.bar(10);`)
  })

  it('should transform nested member expressions', () => {
    const code = `hello.dear.sir();`
    expect(transform(code).code).to.eq(`this.hello.dear.sir();`)
  })

  it('should not transform defined variables', () => {
    const code = 'const x = 0;'
    expect(transform(code).code).to.eq(code)
  })

  it('should not transform defined variables', () => {
    const code = `var y = 0; function foo() { return y; }`
    expect(transform(code).code).to.equalIgnoreSpaces(code)
  })

  it('should rewrite variables inside functions', () => {
    const code = `function f() { return hello + world; }`
    expect(transform(code).code).to.equalIgnoreSpaces(
      `function f() { return this.hello + this.world; }`
    )
  })

  it('should not rewrite function short hand', () => {
    const code = `const x = { create() { return 'hey'; } };`
    expect(transform(code).code).to.equalIgnoreSpaces(code)
  })

  it('should transform arbitrary object expressions', () => {
    const code = `foo = { bar: 10 };`
    expect(transform(code).code).to.eq(`this.foo = { bar: 10 };`)
  })

  it('should not transform Object statements', () => {
    const code = `Object.assign({}, { a: 1, b: 10 });`
    expect(transform(code).code).to.eq(code)
  })

  it('should respect global comments', () => {
    const code = `// global x\nx = 10;`
    expect(transform(code).code).to.eq(code)
  })

  it('should respect multiple global comments', () => {
    const code = `/* global x, y */\nx = y + 10;`
    expect(transform(code).code).to.eq(code)
  })

  it('should not transform global browser variables', () => {
    const code = `console.log('Hello!');\nwindow.location;`
    expect(transform(code, { env: 'browser' }).code).to.eq(code)
  })

  it('should not transform Node variables', () => {
    const code = `
    require('fs');
    Array(10);
    NaN;
    JSON.parse("{}");
    __dirname;
    setTimeout();
    undefined;
    console.log('foo');
    module.exports = {};`
    expect(transform(code, { env: 'node' }).code).to.equalIgnoreSpaces(code)
  })

  it('should transform Node vars without the env', () => {
    const code = `require('fs');`
    expect(transform(code).code).to.eq(`this.require('fs');`)
  })

  /*it('should not transform require statements', () => {
    const compile = source =>
      babel.transform(source, {
        plugins: [plugin],
        presets: [['env', { targets: { node: 'current' } }]]
      })
    const code = `'use strict'; const fs = require('fs');`
    expect(compile(code).code).to.equalIgnoreSpaces(code)
  })*/
})
