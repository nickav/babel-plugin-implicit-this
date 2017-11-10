module.exports = function({ types: t }) {
  function isDefined(name, scope) {
    if (name in scope.references) return true
    if (scope.parent) return isDefined(name, scope.parent)
    return false
  }

  return {
    visitor: {
      Identifier(path) {
        const { node, parent, scope } = path
        if (
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
