const envGlobals = require('globals')

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

  function cohereceArray(obj) {
    return Array.isArray(obj) ? obj : typeof obj !== 'undefined' ? [obj] : []
  }

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

  function parseNamedComments(name, comments) {
    const isNamedComment = str => str.startsWith(`${name} `)

    return (
      (comments || []).reduce((memo, comment) => {
        const value = comment.value.trim()
        if (!isNamedComment(value)) return
        return memo.concat(parseComment(name, value))
      }, []) || []
    )
  }

  function parseComment(name, comment) {
    return comment
      .trim()
      .substr(name.length + 1)
      .split(',')
      .map(str => str.trim())
  }

  return {
    visitor: {
      Program(path, state) {
        const { env: defaultEnv, globals: userGlobals } = state.opts

        let globals = Object.assign(
          {},
          envGlobals['builtin'],
          envGlobals['shared-node-browser'],
          userGlobals || {}
        )

        const { comments } = path.container

        // load global comments
        const globalComments = parseNamedComments('global', comments)
        globalComments.forEach(ident => (globals[ident] = true))

        // load env from comments
        const envs = cohereceArray(defaultEnv)
          .concat(parseNamedComments('eslint-env', comments))
          .concat(parseNamedComments('env', comments))

        envs.forEach(env => {
          if (!(env in envGlobals)) {
            warn(`Unknown env '${env}' specified`)
            return
          }

          globals = Object.assign({}, globals, envGlobals[env])
        })

        state.opts.globals = globals
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
