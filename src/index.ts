import { Lexer, Source, Parser } from "./parser";
import { inspect } from "util";
import { writeFileSync } from "fs";

// const code = `
// <!-- @regular -->
// <!-- @regular1 -->
//   <div id="1" a={a + b} readonly>
//   some text
//   {c + d}
//   <p>
//     <i />
//   </p>
// </div>
// `;

let code = `
{#if a > b}
  <a></a>
{#elseif a}
  <b></b>
{/if}
`;

code = `
  <div id='1'>
    {a + b}
  </div>
`;

code = `
{#if a}
  <a></a>
{#elseif b}
  <b></b>
{#elseif c}
  <c></c>
{#else}
  <d></d>
{/if}
`;

code = `
  {#list @(a + b) as c}
    <div>a</div>
  {#else}
    <a></a>
  {/list}
`;

code = `
{'add: ' + ([1,2,3] | join: '+')}
`;

code = `
{'add: ' + ({a: b + c} | join: '+')}
`;

code = `
{'add: ' + (a + b | join: '+')}
`;

const src = new Source(code);
const lexer = new Lexer(src);
const parser = new Parser(lexer);

// for (const tok of lexer) {
//   console.log(tok);
// }

writeFileSync("test.json", inspect(parser.parseProg(), true, null));
