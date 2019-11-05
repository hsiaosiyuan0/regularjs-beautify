import { AstVisitor } from "../visitor/visitor";
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
  ArrayExpr,
  OnceExpression,
  TagAttr,
  NodeType,
  Token,
  CmdIf,
  CmdElseIf,
  CmdList
} from "../parser";
import { Line, line_, link_, lines_ } from "./line";
import { shrinkLines, sign_, combine } from "./shrink";
import { print } from "./print";

const defaultOptions = {
  printWidth: 80,
  baseIndent: 0
};

export type FormatterOptions = typeof defaultOptions;

class Context {
  indent = 0;
  stmt?: symbol;
}

export class Formatter extends AstVisitor {
  src: Source;
  lexer: Lexer;
  parser: Parser;
  prog?: Prog;

  options: FormatterOptions;

  lines: Line[] = [];
  lastLine?: Line;

  ctxStack: Context[] = [];

  get ctx() {
    return this.ctxStack[this.ctxStack.length - 1];
  }

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
    this.options = Object.assign({}, defaultOptions, options);
  }

  enter() {
    const ctx = new Context();
    this.ctxStack.push(ctx);
    return ctx;
  }

  leave() {
    return this.ctxStack.pop();
  }

  run() {
    const ctx = this.enter();
    ctx.indent = this.options.baseIndent;
    this.prog = this.parser.parseProg();
    this.visitProg(this.prog);
    this.leave();
    const first = shrinkLines(this, this.lines);
    return print(first, this.options.printWidth);
  }

  visitProg(node: Prog) {
    const lines = lines_(this.visitStmts(node.body));
    this.appendLines(lines);
  }

  visitIfStmt(node: IfStatement) {
    const ctx = this.ctx;
    const indent = ctx.indent;
    const cmd = ctx.stmt === CmdIf ? "elseif" : "if";
    const beginNodes = [sign_(`{#${cmd} `), node.test, sign_("}")];
    const beginLine = line_(
      combine(this, beginNodes),
      beginNodes,
      indent,
      true,
      true
    );

    this.enter().indent = indent + 2;
    const consLines = this.visitStmts(node.cons);
    this.leave();

    let altLines: Line[] = [];
    const altCtx = this.enter();
    if (node.alt.length === 1 && node.alt[0]["name"] === CmdElseIf) {
      altCtx.indent = indent;
      altCtx.stmt = CmdIf;
      altLines = this.visitIfStmt(node.alt[0] as any);
    } else if (node.alt.length) {
      altCtx.indent = indent + 2;
      const elseLine = line_("{#else}", [], indent, true, true, true);
      altLines = link_(lines_(elseLine, this.visitStmts(node.alt)));
    }
    this.leave();
    let closeLine: Line | undefined;
    if (node.name === CmdIf) {
      closeLine = line_("{/if}", [], indent, true, true, true);
    }
    return link_(lines_(beginLine, consLines, altLines, closeLine));
  }

  visitListStmt(node: ListStatement) {
    const indent = this.ctx.indent;
    const beginNodes: Array<Token | Expression> = [sign_("{#list ")];
    const argsLen = node.arguments.length;
    node.arguments.forEach((arg, i) => {
      if (i !== 0) beginNodes.push(sign_(" "));
      beginNodes.push(arg);
      if (i === 0 && argsLen > 1) beginNodes.push(sign_(" as"));
      if (i === 1 && argsLen > 2) beginNodes.push(sign_(" by"));
    });
    const beginLine = line_(combine(this, beginNodes), beginNodes, indent);

    this.enter().indent = indent + 2;
    const body = this.visitStmts(node.body);
    this.leave();

    let altLines: Line[] = [];
    if (node.alt.length) {
      altLines.push(line_("{#else}", [], indent, true, true, true));
      this.enter().indent = indent + 2;
      altLines = altLines.concat(this.visitStmts(node.alt));
    }

    const closeLine = line_("{/list}", [], indent, true, true, true);
    return link_(lines_(beginLine, body, altLines, closeLine));
  }

  visitTagAttr(attr: TagAttr) {
    const name = attr.name;
    if (!attr.value) return name;
    let value = this.visitExpr(attr.value);
    if (attr.value.type !== NodeType.StringLiteral) {
      value = `{${value}}`;
    }
    return `${name}=${value}`;
  }

  visitTagAttrs(attrs: TagAttr[]) {
    return attrs.map(attr => this.visitTagAttr(attr)).join(" ");
  }

  visitTagStmt(node: TagStatement) {
    const attrs = this.visitTagAttrs(node.attrs);
    const gap = attrs && " ";
    const indent = this.ctx.indent;
    const open = line_(
      `<${node.name}${gap}${attrs}${node.selfClose ? " /" : ""}>`,
      [node],
      indent,
      true,
      true
    );
    if (node.selfClose) {
      return open;
    }

    const close = `</${node.name}>`;
    if (node.body.length === 0) {
      return line_(open.text + close, [node], indent, true, true);
    }

    this.enter().indent = indent + 2;
    const bodyLines = this.visitStmts(node.body);
    this.leave();

    const closeLine = line_(close, [], indent, true, true, true);
    if (node.body.length === 1 && node.body[0].type === NodeType.TextStmt) {
      open.steel = false;
      closeLine.force = false;
    }

    return link_(lines_(open, bodyLines, closeLine));
  }

  visitTextStmt(node: TextStatement) {
    const value = node.value.trim().replace(/\s+/g, " ");
    return line_(value, [sign_(value)], this.ctx.indent);
  }

  visitCommentStmt(node: CommentStmt) {
    return line_(
      `<!-- ${node.value.trim()} -->`,
      [node],
      this.ctx.indent,
      true,
      true,
      true
    );
  }

  visitCommandStmt(node: CommandStmt) {
    if (node.name === CmdIf || node.name === CmdElseIf)
      return this.visitIfStmt(node as any);
    if (node.name === CmdList) return this.visitListStmt(node as any);
  }

  visitExprStmt(node: ExprStmt) {
    const text = `{${this.visitExpr(node.value)}}`;
    return line_(text, [node], this.ctx.indent);
  }

  appendLines(lines: Line[]) {
    link_([this.lastLine].concat(lines));
    this.lines = this.lines.concat(lines);
  }

  visitStmts(nodes: Statement[]) {
    let lines = lines_(...nodes.map(stmt => this.visitStmt(stmt)));
    // empty contents(newlines, spaces, etc) between statements should be discarded since
    // they will be inserted automatically by printer
    lines = lines.filter(line => !/^\s*$/.test(line.text));
    return lines;
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
      prop = `[${this.visitExpr(node.property)}]`;
    } else {
      prop = `.${this.visitExpr(node.property)}`;
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
    const props = node.properties.map(p => this.visitObjectProp(p));
    return `{ ${props.join(", ")} }`;
  }

  visitObjectProp(node: ObjectProperty) {
    const key = this.visitExpr(node.key);
    const value = this.visitExpr(node.value);
    return `${key}: ${value}`;
  }

  visitArrayExpr(node: ArrayExpr) {
    const items = this.visitSeqExpr(node.elements);
    return `[${items}]`;
  }

  visitParenExpr(node: ParenExpression) {
    const items = this.visitSeqExpr(node.exprs);
    return `(${items})`;
  }

  visitTernaryExpr(node: TernaryExpression) {
    const test = this.visitExpr(node.test);
    const cons = this.visitExpr(node.cons);
    const alt = this.visitExpr(node.alt);
    return `${test} ? ${cons} : ${alt}`;
  }

  visitPipeExpr(node: PipeExpression) {
    const expr = this.visitExpr(node.expr);
    const args = this.visitSeqExpr(node.args);
    const colon = node.args.length ? ":" : "";
    return `${expr} | ${node.name}${colon} ${args}`;
  }

  visitOnceExpr(node: OnceExpression) {
    const expr = this.visitExpr(node.expr);
    return `@(${expr})`;
  }
}
