# regularjs-beautify

This is the missing code formatter of [Regularjs](https://regularjs.github.io/).

## Features

*  Includes a fresh parser rewriting in typescript
*  Follows the styles used in [Prettier](https://prettier.io/)
*  Has few options

## Usage

### Use as lib

`npm install regularjs-beautify`

then 

```ts
import { Formatter } from "regularjs-beautify"
```

### Use as command-line

`npx regularjs-beautify the-file-to-be-beautified`

Above command just puts the results into stdin, plus an option `-w` if you want to effect the source file.

## Contribute

It's easy to do step-in debugging of this repo in VSCode, here are some steps:

* Touch a new file `/src/local_test.ts`
* Put some code like below into that file:

  ```ts
  import { Formatter } from ".";
   
  // the code you want to test 
  const code = `
    <div>hello
  world`;

  // creates a formatter instance
  const formatter = new Formatter(code, "", 1, { printWidth: 80, baseIndent: 0 });

  // do formatting
  console.log(formatter.run());
  ```
  
* Press `F5` and switch to `DEBUG CONSOLE` to see the outputs
