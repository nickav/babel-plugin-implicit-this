# babel-plugin-implicit-this

Ditch your global variables with this syntactic sugar

Transforms globals to implicit this expressions:

Before:
```javascript
x = 10;
```

After:
```javascript
this.x = 10;
```


## Installation

```sh
$ npm install --save-dev babel-plugin-implicit-this
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```js
{
  "plugins": ["implicit-this", { "env": "node", "globals": "./path/to/globals.json" }]
}
```

### Via CLI

```sh
$ babel --plugins implicit-this script.js
```

### Via Node API

```javascript
const globals = {
  foo_global: false
}

require("babel-core").transform("code", {
  plugins: ["implicit-this", { env: 'browser', globals }]
});
```

# License

MIT
