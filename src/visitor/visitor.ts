import {
  Prog,
  IfStatement,
  ListStatement,
  TagStatement,
  TextStatement,
  Statement,
  NodeType,
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
  Expression,
  CommentStmt,
  CommandStmt,
  ExprStmt,
  PipeExpression,
  ArrayExpr,
  OnceExpression
} from "../parser/ast";

export abstract class AstVisitor {
  abstract visitProg(node: Prog): any;
  abstract visitIfStmt(node: IfStatement): any;
  abstract visitListStmt(node: ListStatement): any;
  abstract visitTagStmt(node: TagStatement): any;
  abstract visitTextStmt(node: TextStatement): any;
  abstract visitCommentStmt(node: CommentStmt): any;
  abstract visitCommandStmt(node: CommandStmt): any;
  abstract visitExprStmt(node: ExprStmt): any;
  abstract visitStmts(node: Statement[]): any;

  visitStmt(stmt: Statement) {
    switch (stmt.type) {
      case NodeType.IfStmt:
        return this.visitIfStmt(stmt as any);
      case NodeType.ListStmt:
        return this.visitListStmt(stmt as any);
      case NodeType.TagStmt:
        return this.visitTagStmt(stmt as any);
      case NodeType.TextStmt:
        return this.visitTextStmt(stmt as any);
      case NodeType.ExprStmt:
        return this.visitExprStmt(stmt as any);
    }
  }

  abstract visitIdentifier(node: Identifier): any;
  abstract visitStringLiteral(node: StringLiteral): any;
  abstract visitNumberLiteral(node: NumberLiteral): any;
  abstract visitBooleanLiteral(node: BooleanLiteral): any;
  abstract visitNullLiteral(node: NullLiteral): any;
  abstract visitUndefLiteral(node: UndefLiteral): any;
  abstract visitBinaryExpr(node: BinaryExpression): any;
  abstract visitUnaryExpr(node: UnaryExpression): any;
  abstract visitMemberExpr(node: MemberExpression): any;
  abstract visitCallExpr(node: CallExpression): any;
  abstract visitObjectExpr(node: ObjectExpression): any;
  abstract visitObjectProp(node: ObjectProperty): any;
  abstract visitParenExpr(node: ParenExpression): any;
  abstract visitTernaryExpr(node: TernaryExpression): any;
  abstract visitPipeExpr(node: PipeExpression): any;
  abstract visitArrayExpr(node: ArrayExpr): any;
  abstract visitOnceExpr(node: OnceExpression): any;

  visitExpr(expr: Expression) {
    switch (expr.type) {
      case NodeType.Identifier:
        return this.visitIdentifier(expr as any);
      case NodeType.StringLiteral:
        return this.visitStringLiteral(expr as any);
      case NodeType.NumberLiteral:
        return this.visitNumberLiteral(expr as any);
      case NodeType.BooleanLiteral:
        return this.visitBooleanLiteral(expr as any);
      case NodeType.NullLiteral:
        return this.visitNullLiteral(expr as any);
      case NodeType.UndefinedLiteral:
        return this.visitUndefLiteral(expr as any);
      case NodeType.BinaryExpr:
        return this.visitBinaryExpr(expr as any);
      case NodeType.UnaryExpr:
        return this.visitUnaryExpr(expr as any);
      case NodeType.MemberExpr:
        return this.visitMemberExpr(expr as any);
      case NodeType.CallExpr:
        return this.visitCallExpr(expr as any);
      case NodeType.ObjectExpr:
        return this.visitObjectExpr(expr as any);
      case NodeType.ParenExpr:
        return this.visitParenExpr(expr as any);
      case NodeType.TernaryExpr:
        return this.visitTernaryExpr(expr as any);
      case NodeType.PipeExpr:
        return this.visitPipeExpr(expr as any);
      case NodeType.ObjectProperty:
        return this.visitObjectProp(expr as any);
      case NodeType.ArrayExpr:
        return this.visitArrayExpr(expr as any);
      case NodeType.OnceExpr:
        return this.visitOnceExpr(expr as any);
    }
  }
}
