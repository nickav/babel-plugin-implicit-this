module.exports = function(babel) {
  const t = babel.types

  const globals = {}
  const GLOBAL_COMMENT = 'global '

  function isDefined(name, scope) {
    if (name in scope.references) return true
    if (scope.parent) return isDefined(name, scope.parent)
    return false
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
      Program(path) {
        const { comments } = path.container

        comments.forEach(comment => {
          if (!isGlobalComment(comment.value)) return
          parseGlobals(comment.value).forEach(ident => (globals[ident] = true))
        })
      },
      Identifier(path, state) {
        const { node, parent, scope } = path
        if (
          node.name in globals ||
          isDefined(node.name, scope) ||
          [
            'MemberExpression',
            'ObjectProperty',
            'FunctionDeclaration',
            'ObjectMethod'
          ].includes(parent.type)
        ) {
          return
        }

        path.replaceWith(t.memberExpression(t.identifier('this'), node))
      }
    }
  }
}
