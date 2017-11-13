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

  function isGlobal(globals, name) {
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

      Identifier(path, state) {
        const { node, parent, scope } = path
        if (
          isDefined(node.name, scope) ||
          ['ObjectProperty', 'FunctionDeclaration', 'ObjectMethod'].includes(
            parent.type
          )
        ) {
          log('skipping', node.name, node.type, parent.type)
          if (parent.type === 'MemberExpression') {
            path.stop()
          }
          return
        }

        if (
          isGlobal(state.opts.globals, node.name) ||
          isThisExpression(parent)
        ) {
          log('stop', node.name, node.type, parent.type)
          path.stop()
          return
        }

        log('transform', node.name, node.type, parent.type)

        path.replaceWith(t.memberExpression(t.identifier('this'), node))
      }
    }
  }
}
