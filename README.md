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
  "plugins": ["implicit-this"]
}
```

### Via CLI

```sh
$ babel --plugins implicit-this script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["implicit-this"]
});
```

# License

MIT
