# eslint-plugin-regularjs-beautify

ESLint plugin for [Regularjs](https://regularjs.github.io/). It can be used with the `--fix` option to format an entire JavaScript file which has inline Regularjs template in it.

## Usage

Firstly, install this plugin on your disk:

```bash
npm install eslint-plugin-regularjs-beautify --save-dev
```

Secondly, enable this plugin in your eslint configuration file:

```js
module.exports = {
  plugins: ["regularjs-beautify"],
  rules: {
    // `150` means the value of `printWith` option
    "regularjs-beautify/regularjs": ["error", 150] 
  }
};
```

Finally, lint your js file with the option `--fix`

```
eslint the-target-file.js --fix
```
