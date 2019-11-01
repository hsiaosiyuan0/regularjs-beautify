import { AstVisitor } from "./visitor";
import {
  Prog,
  IfStatement,
  ListStatement,
  TagStatement,
  TextStatement,
  CommentStmt,
  CommandStmt,
  ExprStmt,
  Statement,
  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  UndefLiteral,
  BinaryExpression,
  UnaryExpression,
  MemberExpression,
  CallExpression,
  ObjectExpression,
  ObjectProperty,
  ParenExpression,
  TernaryExpression,
  PipeExpression,
  Source,
  Lexer,
  Parser,
  Expression,
  NodeType,
  Literal,
  Node,
  Token,
  emptyLoc
} from "../parser";

const defaultOptions = {
  printWidth: 80
};

export type FormatterOptions = typeof defaultOptions;

export class Line {
  fine = false;
  prev?: Line;
  next?: Line;
  indent = 0;
  text = "";
  nodes: Array<Statement | Expression | Token> = [];
}

export const line_ = (
  text = "",
  nodes: Array<Statement | Expression | Token> = [],
  indent = 0,
  fine = false
): Line => ({
  text,
  nodes,
  indent,
  fine
});

export const sign_ = (s: string) => Token.newSign(emptyLoc, s);

export class Formatter extends AstVisitor {
  src: Source;
  lexer: Lexer;
  parser: Parser;
  prog: Prog;

  options: FormatterOptions;

  lines: Line[] = [];
  lastLine?: Line;

  constructor(
    code = "",
    file = "",
    startLine = 1,
    options: FormatterOptions = {} as any
  ) {
    super();
    this.src = new Source(code, file, startLine);
    this.lexer = new Lexer(this.src);
    this.parser = new Parser(this.lexer);
    this.prog = this.parser.parseProg();
    this.options = Object.assign(options, defaultOptions);
  }

  run() {
    this.visitProg(this.prog);
    return shrinkLines(this, this.lines);
  }

  visitProg(node: Prog) {
    return this.visitStmts(node.body);
  }

  visitIfStmt(node: IfStatement) {
    throw new Error("Method not implemented.");
  }

  visitListStmt(node: ListStatement) {
    throw new Error("Method not implemented.");
  }

  visitTagStmt(node: TagStatement) {
    throw new Error("Method not implemented.");
  }

  visitTextStmt(node: TextStatement) {
    throw new Error("Method not implemented.");
  }

  visitCommentStmt(node: CommentStmt) {
    throw new Error("Method not implemented.");
  }

  visitCommandStmt(node: CommandStmt) {
    throw new Error("Method not implemented.");
  }

  visitExprStmt(node: ExprStmt) {
    const text = `{${this.visitExpr(node.value)}}`;
    return {
      text,
      nodes: [node]
    };
  }

  appendLine(line: Line) {
    if (this.lastLine) this.lastLine.next = line;
    line.prev = this.lastLine;
    line.next = undefined;
    this.lastLine = line;
    this.lines.push(line);
  }

  visitStmts(node: Statement[]) {
    node.forEach(stmt => {
      const line = this.visitStmt(stmt);
      this.appendLine(line);
    });
  }

  visitIdentifier(node: Identifier) {
    return node.name;
  }

  visitStringLiteral(node: StringLiteral) {
    return `"${node.value}"`;
  }

  visitNumberLiteral(node: NumberLiteral) {
    return node.value;
  }

  visitBooleanLiteral(node: BooleanLiteral) {
    return node.value;
  }

  visitNullLiteral(node: NullLiteral) {
    return "null";
  }

  visitUndefLiteral(node: UndefLiteral) {
    return "undefined";
  }

  visitBinaryExpr(node: BinaryExpression) {
    const left = this.visitExpr(node.left);
    const op = node.op.value;
    const right = this.visitExpr(node.right);
    return `${left} ${op} ${right}`;
  }

  visitUnaryExpr(node: UnaryExpression) {
    const op = node.op.value;
    const arg = this.visitExpr(node.arg);
    return `${op}${arg}`;
  }

  visitMemberExpr(node: MemberExpression) {
    const obj = this.visitExpr(node.object);
    let prop = "";
    if (node.computed) {
      prop = `.${this.visitExpr(node.property)}`;
    } else {
      prop = `[${this.visitExpr(node.property)}]`;
    }
    return `${obj}${prop}`;
  }

  visitSeqExpr(seq: Expression[]) {
    return seq.map(expr => this.visitExpr(expr)).join(", ");
  }

  visitCallExpr(node: CallExpression) {
    const callee = this.visitExpr(node.callee);
    const args = this.visitSeqExpr(node.args);
    return `${callee}(${args})`;
  }

  visitObjectExpr(node: ObjectExpression) {
    throw new Error("Method not implemented.");
  }

  visitObjectProp(node: ObjectProperty) {
    throw new Error("Method not implemented.");
  }

  visitParenExpr(node: ParenExpression) {
    throw new Error("Method not implemented.");
  }

  visitTernaryExpr(node: TernaryExpression) {
    throw new Error("Method not implemented.");
  }

  visitPipeExpr(node: PipeExpression) {
    throw new Error("Method not implemented.");
  }
}

const lines_ = (...lines: Array<Line[] | Line | undefined>) => {
  let ret: Line[] = [];
  lines.forEach(line => {
    if (!line) return;
    if (Array.isArray(line)) ret = ret.concat(line);
    else ret.push(line);
  });
  return ret;
};

const link_ = (lines: Line[]) => {
  const first = lines.shift();
  lines.reduce((prev, cur) => {
    if (prev) prev.next = cur;
    cur.prev = prev;
    return cur;
  }, first);
  if (first) lines.unshift(first);
  return lines;
};

export const shrinkers = {
  [NodeType.BinaryExpr](
    formatter: Formatter,
    node: BinaryExpression,
    indent = 0
  ) {
    const left = formatter.visitExpr(node.left);
    const op = node.op.value;
    const line1 = line_(`${left} ${op}`, [node.left, node.op], indent);
    const line2 = line_(
      formatter.visitExpr(node.right),
      [node.right],
      indent + 2
    );
    link_([line1, line2]);
    return [line1, line2];
  },
  seq(formatter: Formatter, exprs: Expression[], indent = 0) {
    return exprs.map(expr =>
      line_(formatter.visitExpr(expr) + ",", [expr, sign_(",")], indent)
    );
  },
  [NodeType.CallExpr](formatter: Formatter, node: CallExpression, indent = 0) {
    const callee = formatter.visitExpr(node.callee);
    const line1 = line_(`${callee}(`, [node.callee, sign_("(")], indent);
    const seqLines = shrinkers.seq(formatter, node.args, indent + 2);
    const line2 = line_(")", [sign_(")")], indent);
    return link_(lines_(line1, seqLines, line2));
  },
  [NodeType.ExprStmt](formatter: Formatter, node: ExprStmt, indent = 0) {
    const line1 = line_(`{`, [sign_("{")], indent);
    const line2 = line_(
      formatter.visitExpr(node.value),
      [node.value],
      indent + 2
    );
    const line3 = line_("}", [sign_("}")], indent);
    return link_(lines_(line1, line2, line3));
  }
};

export const shrinkLines = (formatter: Formatter, lines: Line[]) => {
  let work = lines.slice(0);
  let buf: Line[] = [];
  let first = lines[0];

  do {
    for (let i = 0; i < work.length; i++) {
      const line = work[i];
      if (line.fine) continue;
      line.fine = line.text.length < formatter.options.printWidth;
      if (line.fine) continue;

      const newLines = shrink(formatter, line);
      link_(lines_(line.prev, newLines, line.next));

      // below result will occur if we fold the large binary expr,
      // this is because we do folding from top to down and binary expr is
      // folded before its children
      // ```
      //   ) +
      //    a(b)
      // ```
      // to `) + a(b)`
      const lastNewLine = newLines[newLines.length - 1];
      const lastNode = lastNewLine.nodes[lastNewLine.nodes.length - 1];
      const afterLine = lastNewLine.next;
      if (lastNode instanceof Token && lastNode.isBin() && afterLine) {
        const last = newLines[newLines.length - 1].text;
        if (
          last.length + afterLine.text.length <
          formatter.options.printWidth
        ) {
          lastNewLine.text += " " + afterLine.text;
          lastNewLine.nodes = lastNewLine.nodes.concat(afterLine.nodes);
          // since append the text of `afterLine` to the end of `lastNewLine` so
          // we should remove `afterLine` here to avoid the duplicates
          lastNewLine.next = afterLine.next;
        }
      }

      buf = buf.concat(newLines);
      if (!newLines[0].prev) first = newLines[0];
    }
    work = buf;
    buf = [];
  } while (work.length);

  return first;
};

export const isShrinkable = (
  node: Token | Statement | Expression
): node is Statement | Expression => {
  if (node instanceof Token) return false;
  if (node instanceof Statement) return true;
  return node.type !== NodeType.Identifier && !(node instanceof Literal);
};

export const combine = (
  formatter: Formatter,
  nodes: Array<Token | Statement | Expression>
) => {
  return nodes
    .map(node => {
      if (node instanceof Token) return node.value;
      if (node instanceof Statement) return formatter.visitStmt(node);
      return formatter.visitExpr(node);
    })
    .join("");
};

export const shrink = (formatter: Formatter, line: Line): Line[] => {
  const i = line.nodes.findIndex(isShrinkable);
  if (i === -1) {
    line.fine = true;
    return [];
  }

  const before = line.nodes.slice(0, i);
  const after = line.nodes.slice(i + 1);

  let beforeLine: Line | undefined;
  if (before.length) beforeLine = line_(combine(formatter, before), before);

  const node = line.nodes[i];
  let newLines = shrinkNode(formatter, node as any, line.indent);

  let afterLine: Line | undefined;
  if (after.length) {
    // if the first item of the `after` part is a sign then it should
    // be considered as the tail of the `newLines`
    const item = after[0];
    if (item instanceof Token && item.isSign()) {
      after.shift();
      let sign = item.value;
      if (sign !== ",") sign = " " + sign;

      const last = newLines[newLines.length - 1];
      last.text += sign;
      last.nodes.push(item);
    }
    if (after.length) afterLine = line_(combine(formatter, after), after);
  }
  return link_(lines_(beforeLine, newLines, afterLine));
};

export const shrinkNode = (
  formatter: Formatter,
  node: Node,
  indent = 0
): Line[] => {
  return shrinkers[node.type](formatter, node, indent);
};

export const print = (line?: Line) => {
  const out: string[] = [];
  while (line) {
    let text = " ".repeat(line.indent) + line.text;
    out.push(text);
    line = line.next;
  }
  return out.join("\n");
};
