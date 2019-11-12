# regularjs-beautify-js

Easy to format all the templates inside a JavaScript file. It **only** takes care of the style of those template strings beginning with the specific html comment - `<!-- @regular -->`. 

Feel free to chain this tool before/after other JavaScript code formatter, it will not conflict with the others since it only work on Regularjs templates and do not touch the other parts of our source code.

## Usage

### Use as lib

`npm install regularjs-beautify-dozen`

then 

```ts
import { format } from "regularjs-beautify-dozen"
```

### Use as command-line

`npx regularjs-beautify-dozen the-file-to-be-beautified`

Above command just puts the results into stdin, plus an option `-w` if you want to effect the source file.
