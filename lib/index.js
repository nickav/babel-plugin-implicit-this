const envGlobals = require('globals')
const {
  parseUserGlobals,
  getEnvsFromComments,
  getGlobalsFromComments,
  getGlobalsForEnvs
} = require('./utils')

const baseGlobals = Object.assign(
  {},
  envGlobals['builtin'],
  envGlobals['shared-node-browser']
)

const DEBUG = false
function log() {
  DEBUG &&
    console.log.apply(console, ['[ImplicitThis]'].concat(Array.from(arguments)))
}

module.exports = function(babel) {
  const t = babel.types

  function isGlobal(name, globals) {
    return name in globals
  }

  function isThisIdentifier(node) {
    return t.isIdentifier(node) && node.name === 'this'
  }

  function leftmostPath(path) {
    const { node } = path
    if (node) {
      if (node.object) return leftmostPath(path.get('object'))
      if (node.callee) return leftmostPath(path.get('callee'))
    }
    return path
  }

  function visitIdentifier(path, state) {
    const { node, parent, scope } = path

    if (
      // node is already defined
      scope.hasBinding(node.name) ||
      node.name in scope.references ||
      // node is a global variable
      isGlobal(node.name, state.opts.globals) ||
      // node is `this`
      isThisIdentifier(node) ||
      // left-hand side of declaration
      (t.isVariableDeclarator(parent) && parent.id === node) ||
      // not a part of the original source
      !node.loc ||
      // key in ObjectExpression Property
      parent.key === node
    ) {
      log('skipping', node.name, node.type, parent.type)
      return
    }

    log('transform', node.name, node.type, parent.type, parent)

    path.replaceWith(t.memberExpression(t.identifier('this'), node))
    path.skip()
  }

  return {
    visitor: {
      Program(path, state) {
        const { env: defaultEnv, globals: filesOrObject } = state.opts
        const userGlobals = parseUserGlobals(filesOrObject)
        const defaultGlobals = Object.assign({}, baseGlobals, userGlobals || {})

        const { comments } = path.container

        // load envs and gloabls
        const envs = getEnvsFromComments(comments, defaultEnv)
        const globals = getGlobalsFromComments(
          comments,
          getGlobalsForEnvs(envs, defaultGlobals)
        )

        state.opts.globals = globals
        state.opts.envs = envs
      },

      MemberExpression(path, state) {
        const leftmost = leftmostPath(path)
        if (leftmost && t.isIdentifier(leftmost.node)) {
          log('MemberExpression', leftmost.node.name)
          visitIdentifier(leftmost, state)
        }
        path.skip()
      },

      Identifier(path, state) {
        visitIdentifier(path, state)
      }
    }
  }
}
