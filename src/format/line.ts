import { Statement, Expression, Token } from "../parser";

export class Line {
  fine = false;
  prev?: Line;
  next?: Line;
  indent = 0;
  text = "";
  // force to be treated as new lint
  force = false;
  // force this line follow the preceding one
  inline = false;
  // flag this line can not be followed by
  steel = false;
  nodes: Array<Statement | Expression | Token> = [];
}

export const line_ = (
  text = "",
  nodes: Array<Statement | Expression | Token> = [],
  indent = 0,
  force = false,
  steel = false,
  fine = false,
  inline = false
): Line => ({
  text,
  nodes,
  indent,
  fine,
  force,
  steel,
  inline
});

export const lines_ = (...lines: Array<Line[] | Line | undefined>) => {
  let ret: Line[] = [];
  lines.forEach(line => {
    if (!line) return;
    if (Array.isArray(line)) ret = ret.concat(line);
    else ret.push(line);
  });
  return ret;
};

export const link_ = (lines: Array<Line | undefined>) => {
  const first = lines.shift();
  const ret: Line[] = [];
  lines.reduce((prev, cur) => {
    if (prev) prev.next = cur;
    if (cur) {
      cur.prev = prev;
      ret.push(cur);
    }
    return cur;
  }, first);
  if (first) ret.unshift(first);
  return ret;
};
