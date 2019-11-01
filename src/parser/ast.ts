import { SourceLoc } from "./source";
import { Token } from "./token";

export enum NodeType {
  Unknown,

  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  UndefinedLiteral,

  ArrayExpr,
  BinaryExpr,
  UnaryExpr,
  MemberExpr,
  CallExpr,
  ObjectProperty,
  ObjectExpr,
  ParenExpr,
  TernaryExpr,
  PipeExpr,

  Prog,
  IfStmt,
  ListStmt,
  TagStmt,
  TextStmt,
  CommentStmt,
  ExprStmt,
  CommandStmt,

  TagAttr
}

export class Node {
  type: NodeType;
  loc: SourceLoc;

  constructor(type: NodeType, loc: SourceLoc) {
    this.type = type;
    this.loc = loc;
  }
}

export enum StmtKind {
  Unknown,
  Prog,
  If,
  List,
  Tag,
  Text,
  Comment,
  Expr
}

export class Statement extends Node {
  kind: StmtKind;
  body: Statement[];

  constructor(type: NodeType, loc: SourceLoc) {
    super(type, loc);
    this.kind = StmtKind.Unknown;
    this.body = [];
  }
}
export class Expression extends Node {
  isOnce = false;
}

export class Prog extends Statement {
  body: Statement[];

  constructor(loc: SourceLoc, body: Statement[]) {
    super(NodeType.Prog, loc);
    this.body = body;
  }
}

export class Identifier extends Expression {
  name: string;

  constructor(loc: SourceLoc, name: string) {
    super(NodeType.Identifier, loc);
    this.name = name;
  }
}

export class ArrayExpr extends Expression {
  elements: Expression[];

  constructor(loc: SourceLoc, elements: Expression[] = []) {
    super(NodeType.ArrayExpr, loc);
    this.elements = elements;
  }
}

export class ObjectExpr extends Expression {
  properties: ObjectProperty[];

  constructor(loc: SourceLoc, properties: ObjectProperty[] = []) {
    super(NodeType.ObjectExpr, loc);
    this.properties = properties;
  }
}

export class StringLiteral extends Expression {
  value: string;

  constructor(loc: SourceLoc, value: string) {
    super(NodeType.StringLiteral, loc);
    this.value = value;
  }
}

export class Literal extends Expression {}

export class NumberLiteral extends Literal {
  value: string;

  constructor(loc: SourceLoc, value: string) {
    super(NodeType.NumberLiteral, loc);
    this.value = value;
  }
}

export class BooleanLiteral extends Literal {
  value: string;

  constructor(loc: SourceLoc, value: string) {
    super(NodeType.BooleanLiteral, loc);
    this.value = value;
  }
}

export class NullLiteral extends Literal {
  value: string;

  constructor(loc: SourceLoc, value: string) {
    super(NodeType.NullLiteral, loc);
    this.value = value;
  }
}

export class UndefLiteral extends Literal {
  value: string;

  constructor(loc: SourceLoc, value: string) {
    super(NodeType.UndefinedLiteral, loc);
    this.value = value;
  }
}

export class BinaryExpression extends Expression {
  op: Token;
  left: Expression;
  right: Expression;

  constructor(loc: SourceLoc, op: Token, left: Expression, right: Expression) {
    super(NodeType.BinaryExpr, loc);
    this.op = op;
    this.left = left;
    this.right = right;
  }
}

export class UnaryExpression extends Expression {
  op: Token;
  arg: Expression;

  constructor(loc: SourceLoc, op: Token, arg: Expression) {
    super(NodeType.UnaryExpr, loc);
    this.op = op;
    this.arg = arg;
  }
}

export class MemberExpression extends Expression {
  object: Expression;
  property: Expression;
  computed: boolean;

  constructor(
    loc: SourceLoc,
    object: Expression,
    property: Expression,
    computed: boolean
  ) {
    super(NodeType.MemberExpr, loc);
    this.object = object;
    this.property = property;
    this.computed = computed;
  }
}

export class CallExpression extends Expression {
  callee: Expression;
  args: Expression[];

  constructor(loc: SourceLoc, callee: Expression, args: Expression[]) {
    super(NodeType.CallExpr, loc);
    this.callee = callee;
    this.args = args;
  }
}

export class ObjectProperty extends Node {
  key: Expression;
  value: Expression;
  computed: boolean;

  constructor(
    loc: SourceLoc,
    key: Expression,
    value: Expression,
    computed: boolean = false
  ) {
    super(NodeType.ObjectProperty, loc);
    this.key = key;
    this.value = value;
    this.computed = computed;
  }
}

export class ObjectExpression extends Expression {
  properties: ObjectProperty[];

  constructor(loc: SourceLoc, properties: ObjectProperty[]) {
    super(NodeType.ObjectExpr, loc);
    this.properties = properties;
  }
}

export class ParenExpression extends Expression {
  expr: Expression;

  constructor(loc: SourceLoc, expr: Expression) {
    super(NodeType.ObjectExpr, loc);
    this.expr = expr;
  }
}

export class TernaryExpression extends Expression {
  test: Expression;
  cons: Expression;
  alt: Expression;

  constructor(
    loc: SourceLoc,
    test: Expression,
    cons: Expression,
    alt: Expression
  ) {
    super(NodeType.TernaryExpr, loc);
    this.test = test;
    this.cons = cons;
    this.alt = alt;
  }
}

export class PipeExpression extends Expression {
  expr: Expression;
  name: string;
  args: Expression[];

  constructor(
    loc: SourceLoc,
    expr: Expression,
    name: string,
    args: Expression[] = []
  ) {
    super(NodeType.PipeExpr, loc);
    this.expr = expr;
    this.name = name;
    this.args = args;
  }
}

export class CommentStmt extends Statement {
  value: string;

  constructor(loc: SourceLoc, value: string) {
    super(NodeType.CommentStmt, loc);
    this.value = value;
  }
}

export class ExprStmt extends Statement {
  value: Expression;

  constructor(loc: SourceLoc, value: Expression) {
    super(NodeType.ExprStmt, loc);
    this.value = value;
  }
}

export class TagAttr extends Node {
  name: string;
  value?: Expression;

  constructor(loc: SourceLoc, name: string, value?: Expression) {
    super(NodeType.TagAttr, loc);
    this.name = name;
    this.value = value;
  }
}

export class TagStatement extends Statement {
  name: string;
  attrs: TagAttr[];
  body: Statement[];
  selfClose: boolean;
  isClose: boolean;

  constructor(
    loc: SourceLoc,
    name: string,
    attrs: TagAttr[] = [],
    body: Statement[] = []
  ) {
    super(NodeType.TagStmt, loc);
    this.kind = StmtKind.Tag;
    this.name = name;
    this.attrs = attrs;
    this.body = body;
    this.selfClose = false;
    this.isClose = false;
  }
}

export type MayBeCloseStmt = TagStatement | CommandStmt;

export const CmdIf = Symbol.for("if");
export const CmdElseIf = Symbol.for("elseif");
export const CmdElse = Symbol.for("else");
export const CmdList = Symbol.for("list");

export class CommandStmt extends Statement {
  name: symbol;
  arguments: Expression[];
  isClose: boolean;

  constructor(loc: SourceLoc, name: symbol) {
    super(NodeType.TagStmt, loc);
    this.name = name;
    this.arguments = [];
    this.isClose = false;
  }
}

export class IfStatement extends CommandStmt {
  test: Expression;
  cons: Statement[];
  alt: Statement[];

  constructor(
    loc: SourceLoc,
    test: Expression,
    cons: Statement[] = [],
    alt: Statement[] = []
  ) {
    super(loc, CmdIf);
    this.kind = StmtKind.If;
    this.test = test;
    this.cons = cons;
    this.alt = alt;
  }
}

export class ListStatement extends CommandStmt {
  body: Statement[];
  alt: Statement[];
  isClose: boolean;

  constructor(loc: SourceLoc, body: Statement[] = [], alt: Statement[] = []) {
    super(loc, CmdList);
    this.kind = StmtKind.List;
    this.body = body;
    this.alt = alt;
    this.isClose = false;
  }
}

export class TextStatement extends Statement {
  value: string;

  constructor(loc: SourceLoc, value: string) {
    super(NodeType.TextStmt, loc);
    this.kind = StmtKind.Text;
    this.value = value;
  }

  isEmpty() {
    return /^\s*$/.test(this.value);
  }
}

export const emptyLoc = new SourceLoc();
export const unknownExpr = new Expression(NodeType.Unknown, emptyLoc);
export const unknownStmt = new Statement(NodeType.Unknown, emptyLoc);
