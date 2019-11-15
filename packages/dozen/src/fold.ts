import {
  isTemplate,
  Source,
  Lexer,
  Parser,
  TagStatement,
  AstVisitor,
  Prog,
  IfStatement,
  ListStatement,
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
  TernaryExpression,
  ParenExpression,
  PipeExpression,
  ArrayExpr,
  OnceExpression,
  Node,
  CmdIf,
  CmdElseIf,
  CmdList
} from "regularjs-beautify-core";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import { TemplateLiteral } from "@babel/types";

type TmpStrInfo = {
  node: TemplateLiteral;
  indent: number;
  line: number;
  code: string;
};

type Range = [number, number];

export const scan = (code: string) => {
  const ast = parse(code, {
    sourceType: "unambiguous",
    plugins: ["jsx", "typescript", "v8intrinsic"]
  });

  const tmpArr: TmpStrInfo[] = [];
  traverse(ast, {
    TemplateLiteral(path: NodePath<TemplateLiteral>) {
      const node = path.node;
      const start = node.start! + 1;
      const end = node.end! - 1;
      if (start >= end) return;

      const str = code.slice(start, end);
      const { ok, indent, line } = isTemplate(str, node.loc!.start.line);
      if (!ok) return;

      tmpArr.push({
        node: path.node!,
        indent,
        // convert to zero-based line number
        line: line - 1,
        code: str
      });
    }
  });

  let ranges: Range[] = [];
  tmpArr.forEach(tmp => {
    const source = new Source(tmp.code, "", tmp.line);
    const lexer = new Lexer(source);
    const parser = new Parser(lexer);
    try {
      const ast = parser.parseProg();
      const visitor = new Visitor();
      ranges = ranges.concat(visitor.visitProg(ast));
    } catch (error) {
      // suppress parsing errors
    }
  });
  return ranges;
};

const range = (node: Node): Range => [node.loc.start.line, node.loc.end.line];

class Visitor extends AstVisitor {
  ranges: Range[] = [];

  visitProg(node: Prog) {
    this.visitStmts(node.body);
    return this.ranges;
  }

  visitIfStmt(node: IfStatement) {
    this.ranges.push(range(node));
    this.visitStmts(node.cons);
    this.visitStmts(node.alt);
  }

  visitListStmt(node: ListStatement) {
    this.ranges.push(range(node));
    this.visitStmts(node.body);
    this.visitStmts(node.alt);
  }

  visitTagStmt(node: TagStatement) {
    if (node.attrs.length) {
      let start = node.attrs[0].loc.start.line;
      let end = node.attrs[0].loc.end.line;
      if (node.attrs.length > 1) {
        end = node.attrs[node.attrs.length - 1].loc.end.line;
      }
      this.ranges.push([start, end]);
    }
    if (!node.selfClose) {
      this.ranges.push(range(node));
    }
    this.visitStmts(node.body);
  }

  visitTextStmt(node: TextStatement) {}

  visitCommentStmt(node: CommentStmt) {
    this.ranges.push(range(node));
  }

  visitCommandStmt(node: CommandStmt) {
    if (node.name === CmdIf || node.name === CmdElseIf)
      return this.visitIfStmt(node as any);
    if (node.name === CmdList) return this.visitListStmt(node as any);
  }

  visitExprStmt(node: ExprStmt) {
    this.ranges.push(range(node));
  }

  visitStmts(node: Statement[]) {
    node.forEach(stmt => this.visitStmt(stmt));
  }

  visitIdentifier(node: Identifier) {}

  visitStringLiteral(node: StringLiteral) {}

  visitNumberLiteral(node: NumberLiteral) {}

  visitBooleanLiteral(node: BooleanLiteral) {}

  visitNullLiteral(node: NullLiteral) {}

  visitUndefLiteral(node: UndefLiteral) {}

  visitBinaryExpr(node: BinaryExpression) {}

  visitUnaryExpr(node: UnaryExpression) {}

  visitMemberExpr(node: MemberExpression) {}

  visitCallExpr(node: CallExpression) {}

  visitObjectExpr(node: ObjectExpression) {}

  visitObjectProp(node: ObjectProperty) {}

  visitParenExpr(node: ParenExpression) {}

  visitTernaryExpr(node: TernaryExpression) {}

  visitPipeExpr(node: PipeExpression) {}

  visitArrayExpr(node: ArrayExpr) {}

  visitOnceExpr(node: OnceExpression) {}
}
