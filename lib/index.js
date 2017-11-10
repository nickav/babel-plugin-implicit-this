module.exports = function() {
  return {
    visitor: {
      VariableDeclaration(path) {
        console.log('VariableDeclaration', path.node)
      },
      Identifier({ node, parent, scope }) {
        if (['MemberExpression', 'Property'].includes(parent.type)) {
          return
        }
        /*t.memberExpression(
          t.identifier('this'),
          t.identifier(node.name)
        )*/

        console.log(node)
      }
    }
  }
}
