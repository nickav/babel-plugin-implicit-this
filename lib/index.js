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

function warn() {
  console.warn.apply(console, ['[ImplicitThis]'].concat(Array.from(arguments)))
}

module.exports = function(babel) {
  const t = babel.types

  function isDefined(name, scope) {
    if (name in scope.references) return true
    if (scope.parent) return isDefined(name, scope.parent)
    return false
  }

  function isGlobal(name, globals) {
    return name in globals
  }

  function isThisIdentifier(node) {
    return node.type === 'Identifier' && node.name === 'this'
  }

  function isThisExpression(node) {
    if (!node) return false
    if (node.object) return isThisExpression(node.object)
    return isThisIdentifier(node)
  }

  function leftmostPath(path) {
    const { node } = path
    if (node) {
      if (node.object) return leftmostPath(path.get('object'))
      if (node.callee) return leftmostPath(path.get('callee'))
    }
    return path
  }

  function leftmostNode(node) {
    if (node.object) return leftmostNode(node.object)
    if (node.callee) return leftmostNode(node.callee)
    return node
  }

  function visitIdentifier(path, state) {
    const { node, parent, scope } = path

    if (
      isDefined(node.name, scope) ||
      isGlobal(node.name, state.opts.globals) ||
      isThisIdentifier(node) ||
      parent.key === node /* key in ObjectExpression Property. */
    ) {
      log('skipping', node.name, node.type, parent.type)
      return
    }

    log('transform', node.name, node.type, parent.type)

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
        path.skip()
      }
    }
  }
}
