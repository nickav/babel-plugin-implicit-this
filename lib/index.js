const envGlobals = require('globals')

const DEBUG = true
function log() {
  DEBUG &&
    console.log.apply(console, ['[Plugin]'].concat(Array.from(arguments)))
}

module.exports = function(babel) {
  const t = babel.types

  const globals = Object.assign(
    {},
    envGlobals['builtin'],
    envGlobals['shared-node-browser']
  )

  const GLOBAL_COMMENT = 'global '

  function isDefined(name, scope) {
    if (name in scope.references) return true
    if (scope.parent) return isDefined(name, scope.parent)
    return false
  }

  function isGlobal(name) {
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

  function isGlobalComment(str) {
    return str.trim().startsWith(GLOBAL_COMMENT)
  }

  function parseGlobals(comment) {
    return comment
      .trim()
      .substr(GLOBAL_COMMENT.length)
      .split(',')
      .map(str => str.trim())
  }

  return {
    visitor: {
      Program(path, state) {
        const { env: defaultEnv, globals: userGlobals } = state.opts

        if (userGlobals) globals = Object.assign({}, globals, userGlobals)

        // load global comments
        const { comments } = path.container

        comments.forEach(comment => {
          if (!isGlobalComment(comment.value)) return
          parseGlobals(comment.value).forEach(ident => (globals[ident] = true))
        })

        // TODO: load env from comments
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

        if (isGlobal(node.name) || isThisExpression(parent)) {
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
