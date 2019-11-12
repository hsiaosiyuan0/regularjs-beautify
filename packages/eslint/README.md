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

Before we start lint, we need to add a specific flag at the top of our each template string to explicitly indicate they are under the semantics of Regularjs:

```js
const tpl = `
<!-- @regularjs -->
<div></div>
`;
```

Please notice the snippet `<!-- @regularjs -->`, it's required to tell eslint to entre the logic of this plugin. 

> It maybe odd that we have to put the html comment at the top of each template, let's give it a little bit explanation. Suppose we are at the viewpoint of the plugin, there is no information for us to tell the string is a normal string or a specific one being used as Regularjs template, thus we cannot give user the exacter lint reports. So the comment is used to help the user to indicate their intents more clearly thus help the plugin to tell the difference between the normal string and the regularjs one.

Finally, lint your js file with the option `--fix`

```
eslint the-target-file.js --fix
```
