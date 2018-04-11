const JSGlobals = require('globals')

const {
  parseUserGlobals,
  getEnvsFromComments,
  getGlobalsFromComments,
  getGlobalsForEnvs
} = require('./utils')

const DEBUG = (((process || {}).env || {}).DEBUG || '')
  .split(',')
  .some(str => str === 'implicit-this')

function log() {
  DEBUG &&
    console.log.apply(console, ['[ImplicitThis]'].concat(Array.from(arguments)))
}

function coereceArray(obj) {
  return Array.isArray(obj) ? obj : typeof obj !== 'undefined' ? [obj] : []
}

module.exports = function(babel) {
  const t = babel.types

  function isDefined(node, scope) {
    return scope.hasBinding(node.name) || node.name in scope.references
  }

  function isGlobal(name, globals) {
    return name in globals
  }

  function isThisIdentifier(node, parent) {
    return (
      t.isIdentifier(node) &&
      parent.type === 'MemberExpression' &&
      parent.object.type === 'ThisExpression'
    )
  }

  function variableExists(node, parent) {
    const justDeclared =
      t.isVariableDeclarator(parent) && parent.id.name === node.name

    return !justDeclared || (parent.scope && isDefined(node, parent.scope))
  }

  return {
    visitor: {
      Program(path, state) {
        const { env: defaultEnv, globals: filesOrObject, strict } = state.opts

        const userGlobals = parseUserGlobals(filesOrObject)

        const defaultGlobals = Object.assign(
          {},
          JSGlobals['builtin'],
          JSGlobals['shared-node-browser'],
          userGlobals || {}
        )

        const { comments } = path.container

        // load envs and gloabls
        const envs = strict
          ? coereceArray(defaultEnv)
          : getEnvsFromComments(comments, coereceArray(defaultEnv))

        const envGlobals = getGlobalsForEnvs(envs, defaultGlobals)

        const globals = strict
          ? envGlobals
          : getGlobalsFromComments(comments, envGlobals)

        state.opts.globals = globals
        state.opts.envs = envs
      },

      Identifier(path, state) {
        const { node, parent, scope } = path

        const defined =
          (isDefined(node, scope) && variableExists(node, parent)) ||
          isGlobal(node.name, state.opts.globals)

        const isThis = isThisIdentifier(node, parent)

        const skip =
          // left-hand side of declaration
          (t.isVariableDeclarator(parent) && parent.id === node) ||
          // not a part of the original source
          !node.loc ||
          // key in ObjectExpression
          (t.isObjectExpression(parent) && parent.key === node) ||
          (t.isLabeledStatement(parent) && parent.label === node) ||
          (t.isObjectProperty(parent) &&
            parent.key === node &&
            !parent.computed) ||
          // MemberExpression property
          (!parent.computed &&
            t.isMemberExpression(parent) &&
            parent.property === node) ||
          // method name
          (t.isObjectMethod(parent) && parent.key === node)

        log(node.type, node.name, 'parent', parent.type)

        if (defined || isThis || skip) {
          log('  ', 'defined:', defined, ' this:', isThis, ' skip:', skip)
          return
        }

        log('  ', 'replace')
        path.replaceWith(t.memberExpression(t.identifier('this'), node))
      }
    }
  }
}
