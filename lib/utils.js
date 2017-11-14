const fs = require('fs')
const path = require('path')
const envGlobals = require('globals')

const CACHE = {}

function warn() {
  console.warn.apply(console, ['[ImplicitThis]'].concat(Array.from(arguments)))
}

function cohereceArray(obj) {
  return Array.isArray(obj) ? obj : typeof obj !== 'undefined' ? [obj] : []
}

function parseNamedComments(name, comments) {
  const isNamedComment = str => str.startsWith(`${name} `)

  const result =
    (comments || []).reduce((memo, comment) => {
      const value = comment.value.trim()
      if (!isNamedComment(value)) return memo
      return memo.concat(parseComment(name, value))
    }, []) || []

  return result
}

function parseComment(name, comment) {
  return comment
    .trim()
    .substr(name.length + 1)
    .split(',')
    .map(str => str.trim())
}

module.exports = {
  parseUserGlobals(filesOrObject, useCache = true) {
    if (typeof filesOrObject === 'object') return filesOrObject

    if (typeof filesOrObject === 'string') {
      if (!filesOrObject.endsWith('.json')) {
        filesOrObject += '.json'
      }

      if (useCache && CACHE[filesOrObject]) return CACHE[global]
      const globals = JSON.parse(fs.readFileSync(path.resolve(filesOrObject)))
      CACHE[filesOrObject] = globals
      return globals
    }
  },

  getEnvsFromComments(comments, defaultEnv) {
    const envs = cohereceArray(defaultEnv)
      .concat(parseNamedComments('eslint-env', comments))
      .concat(parseNamedComments('env', comments))

    return envs.filter(env => {
      if (env !== 'none' && !(env in envGlobals)) {
        warn(`Unknown env '${env}' specified`)
        return false
      }

      return true
    })
  },

  getGlobalsFromComments(comments, defaultGlobals = {}) {
    let globals = Object.assign({}, defaultGlobals)

    const globalComments = parseNamedComments('global', comments)
    globalComments.forEach(ident => (globals[ident] = true))

    return globals
  },

  getGlobalsForEnvs(envs, defaultGlobals = {}) {
    let globals = Object.assign({}, defaultGlobals)

    envs.forEach(env => {
      if (env === 'none') {
        globals = defaultGlobals
        return
      }

      if (!(env in envGlobals)) {
        warn(`Unknown env '${env}' specified`)
        return
      }

      globals = Object.assign({}, globals, envGlobals[env])
    })

    return globals
  }
}
