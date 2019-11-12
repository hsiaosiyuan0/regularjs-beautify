import { Formatter, isTemplate, LocatableError } from "regularjs-beautify-core";
import { parse, ParserOptions } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import { TemplateLiteral } from "@babel/types";
import chalk from "chalk";
import fs from "fs";

const { readFile, writeFile } = fs.promises;

const log = console.log;
export const fatal = (msg: string) => {
  log(chalk.red(msg));
  process.exit(1);
};

const defaultOpts: ParserOptions = {
  sourceType: "unambiguous",
  plugins: ["jsx", "typescript", "v8intrinsic"]
};

const defaultFormatterOpts = {
  baseIndent: 0,
  printWidth: 80
};

interface ReplaceRange {
  start: number;
  end: number;
  cooked: string;
}

export const format = (
  file: string,
  code: string,
  formatOpts = defaultFormatterOpts,
  parserOpts: ParserOptions = {}
) => {
  const ast = parse(code, Object.assign({}, defaultOpts, parserOpts));
  const ranges: ReplaceRange[] = [];
  traverse(ast, {
    TemplateLiteral(path: NodePath<TemplateLiteral>) {
      const node = path.node;
      const start = node.start! + 1;
      const end = node.end! - 1;
      if (start >= end) return;

      const str = code.slice(start, end);
      const { ok, indent, line } = isTemplate(str, node.loc!.start.line);
      if (!ok) return;

      const formatter = new Formatter(
        str,
        file,
        line,
        Object.assign({}, defaultFormatterOpts, formatOpts)
      );
      const cooked = "\n" + formatter.run();
      ranges.push({
        start,
        end,
        cooked
      });
    }
  });
  const rangesLen = ranges.length;
  return ranges
    .map((r, i) => {
      const prevRange = ranges[i - 1];
      const prev = prevRange ? prevRange.end : 0;
      const prevPartial = code.slice(prev, r.start);
      let str = prevPartial + r.cooked;
      if (i === rangesLen - 1 && r.end <= code.length - 1) {
        str += code.slice(r.end);
      }
      return str;
    })
    .join("");
};

export const formatFile = async (
  file: string,
  formatOpts = defaultFormatterOpts,
  opts: ParserOptions = {}
) => {
  try {
    const code = (await readFile(file)).toString();
    const cooked = format(file, code, formatOpts, opts);
    await writeFile(file, cooked);
  } catch (err) {
    let msg = err.message;
    if (err instanceof LocatableError) {
      const { line, column } = err.loc.start;
      msg += ` at line: ${line - 1} column: ${column}`;
    }
    fatal(msg);
  }
};
