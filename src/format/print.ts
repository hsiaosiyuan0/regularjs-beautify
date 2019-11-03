import { Line } from "./line";
import { isBin } from "../parser";
import debug from "debug";

const log = debug("regularjs:print");

const line_ = (line: Line, indent = true) =>
  (indent ? " ".repeat(line.indent) : "") + line.text;

export const print = (line?: Line, printWidth = 80) => {
  const out: string[] = [];
  while (line) {
    log(line);
    let text = line_(line);
    // concat next lines if:
    // 1. current line is not steel and the next is not `force` and the length of
    // next is less then the remain of current line
    // 2. current line is not steel and the next is `inline`
    while (
      !line.steel &&
      line.next &&
      (text.length < printWidth || line.next.inline)
    ) {
      const next = line.next;
      log(next);
      const nt = line_(next, false);
      if (
        next.inline ||
        (text.length + nt.length <= printWidth && !next.force)
      ) {
        const b = isBin(nt);
        text += (b ? " " : "") + nt + (b ? " " : "");
        line = line.next;
      } else break;
    }
    out.push(text);
    line = line.next;
  }
  return out.join("\n");
};
