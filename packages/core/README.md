# regularjs-beautify-core

This is the core of regularjs-beautify, it contains the core logic about beautifying and is designed as easy to be integrated with. You'll normally use this repo directly, consider to use the other downstream repositories.

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
