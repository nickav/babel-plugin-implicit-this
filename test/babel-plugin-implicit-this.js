const babel = require('babel-core')
const plugin = require('../lib')
const chai = require('chai')
chai.use(require('chai-string'))
const { expect } = chai
const transform = (source, options) =>
  babel.transform(source, { plugins: [[plugin, options]] })

describe('babel-plugin-implicit-this', () => {
  describe('should transform', () => {
    it('undefined variables', () => {
      expect(transform('a;').code).to.eq('this.a;')
    })

    it('basic assignments', () => {
      expect(transform('x = 10;').code).to.eq('this.x = 10;')
    })

    it('member expressions', () => {
      const code = `foo.bar(10);`
      expect(transform(code).code).to.eq(`this.foo.bar(10);`)
    })

    it('multiple member expressions', () => {
      const code = `y.x.z = 2;a.b.c = 1;`
      expect(transform(code).code).to.eq(`this.y.x.z = 2;this.a.b.c = 1;`)
    })

    it('nested member expressions', () => {
      const code = `hello.dear.sir();`
      expect(transform(code).code).to.eq(`this.hello.dear.sir();`)
    })

    it('variables inside functions', () => {
      const code = `function f() { return hello + world; }`
      expect(transform(code).code).to.equalIgnoreSpaces(
        `function f() { return this.hello + this.world; }`
      )
    })

    it('arbitrary object expressions', () => {
      const code = `var car = 1; var obj = { bar: 10, moo: car };`
      expect(transform(code).code).to.equalIgnoreSpaces(code)
    })

    it('arbitrary object expressions with globals', () => {
      const code = `foo = { bar: 10, moo: car };`
      expect(transform(code).code).to.eq(
        `this.foo = { bar: 10, moo: this.car };`
      )
    })
  })

  describe('should not transform', () => {
    it('defined variables', () => {
      const code = 'const x = 0;'
      expect(transform(code).code).to.eq(code)
    })

    it('defined variables inside functions', () => {
      const code = `var y = 0; function foo() { return y; }`
      expect(transform(code).code).to.equalIgnoreSpaces(code)
    })

    it('function short hand', () => {
      const code = `const x = { create() { return 'hey'; } };`
      expect(transform(code).code).to.equalIgnoreSpaces(code)
    })

    it('object statements', () => {
      const code = `Object.assign({}, { a: 1, b: 10 });`
      expect(transform(code).code).to.eq(code)
    })

    it('object properties', () => {
      const code = `var context = {}; context.id;`
      expect(transform(code).code).to.equalIgnoreSpaces(code)
    })

    it('chained function calls', () => {
      const code = `[1,2,3].filter(e => e).map(e => e * 2);`
      expect(transform(code).code).to.equalIgnoreSpaces(code)
    })
  })

  describe('globals', () => {
    it('should respect global comments', () => {
      const code = `// global x\nx = 10;`
      expect(transform(code).code).to.eq(code)
    })

    it('should respect multiple global comments', () => {
      const code = `/* global x, y */\nx = y + 10;`
      expect(transform(code).code).to.eq(code)
    })

    it('should load a file if file is specified', () => {
      const code = `foo_global = 'bar';`
      expect(
        transform(code, { globals: './test/globals.json' }).code
      ).to.equalIgnoreSpaces(code)
    })
  })

  describe('env', () => {
    it('should read env from comments', () => {
      const code = `/* env browser */\nwindow.location;`
      expect(transform(code).code).to.eq(code)
    })

    it('should read eslint-env comments', () => {
      const code = `/* eslint-env browser */\nwindow.location;`
      expect(transform(code).code).to.eq(code)
    })

    describe('node', () => {
      it('should transform Node variables with env node', () => {
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
    })

    describe('browser', () => {
      it('should not transform global variables', () => {
        const code = `console.log('Hello!');\nwindow.location;HTMLElement;`
        expect(transform(code, { env: 'browser' }).code).to.eq(code)
      })
    })

    describe('none', () => {
      it('should not transform Node vars', () => {
        const code = `require('fs');`
        expect(transform(code).code).to.eq(`this.require('fs');`)
      })

      it('should not transform browser vars', () => {
        const code = `window.location;`
        expect(transform(code).code).to.eq(`this.window.location;`)
      })
    })
  })
})
