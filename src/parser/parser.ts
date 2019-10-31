import { Lexer } from "./lexer";
import { TokKind, Token, Sign, tokEos } from "./token";
import {
  Node,
  TagStatement,
  Identifier,
  TagAttr,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  UndefinedLiteral,
  Expression,
  CallExpression,
  MemberExpression,
  ParenExpression,
  UnaryExpression,
  BinaryExpression,
  TernaryExpression,
  TextStatement,
  Prog,
  IfStatement,
  CommentStmt,
  Statement,
  ExprStmt,
  unknownExpr,
  MayBeCloseStmt,
  CmdIf,
  CommandStmt,
  CmdElse,
  ListStatement,
  CmdElseIf,
  CmdList,
  PipeExpression,
  ArrayExpr,
  ObjectExpr,
  ObjectProperty
} from "./ast";

export class Parser {
  lexer: Lexer;
  tok: Token;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.tok = tokEos;
  }

  get src() {
    return this.lexer.src;
  }

  finNode<T extends Node>(node: T) {
    node.loc.end = this.lexer.pos;
    return node;
  }

  next(skipWhitespace = true) {
    this.tok = this.lexer.next(skipWhitespace);
    return this.tok;
  }

  parseIdentifier() {
    const tok = this.next();
    if (!tok.isId()) this.raiseErr(tok);
    const node = new Identifier(tok.loc, tok.value);
    return this.finNode(node);
  }

  parseBinExpr(left?: Expression, p: number = 0) {
    if (!left) left = this.parseAtom();

    let ahead = this.lexer.peek();
    while (ahead.isBin() && ahead.pcd() >= p) {
      let op = this.next();
      let rhs = this.parseAtom();
      ahead = this.lexer.peek();
      while ((ahead.isBin() && ahead.pcd() > op.pcd()) || ahead.isAssocR()) {
        rhs = this.parseBinExpr(rhs, ahead.pcd());
        ahead = this.lexer.peek();
      }
      left = new BinaryExpression(op.loc.clone(), op, left, rhs);
    }
    return this.finNode(left);
  }

  parseTernaryExpr(): Expression {
    const test = this.parseBinExpr();
    if (!this.aheadIsSign(Sign.Cond)) return test;

    // consume `?`
    this.lexer.next();
    const cons = this.parseBinExpr();
    this.nextMustSign(Sign.Colon);
    const alt = this.parseBinExpr();
    return this.finNode(
      new TernaryExpression(test.loc.clone(), test, cons, alt)
    );
  }

  parsePipeExpr() {
    const expr = this.parseTernaryExpr();
    if (!this.aheadIsSign(Sign.Pipe)) return expr;

    // consume `|`
    this.lexer.next();
    const name = this.assertNext(tok => tok.kind === TokKind.Identifier);
    const node = new PipeExpression(expr.loc, expr, name.value);
    if (this.aheadIsSign(Sign.Colon)) {
      this.lexer.next();
      while (true) {
        node.args.push(this.parseTernaryExpr());
        if (this.aheadIsSign(Sign.Comma)) {
          this.next();
        } else break;
      }
    }
    return this.finNode(node);
  }

  parseExpr() {
    return this.parsePipeExpr();
  }

  parseExprOnce() {
    this.nextMustSign("(");
    const expr = this.parseExpr();
    expr.isOnce = true;
    this.nextMustSign(")");
    return expr;
  }

  raiseErr(tok: Token): never {
    const line = tok.loc.start.line;
    const col = tok.loc.start.column;
    throw new Error(
      `Unexpected tok ${tok.value} at line: ${line} column: ${col}`
    );
  }

  parseAtom(): Expression {
    const tok = this.next();
    switch (tok.kind) {
      case TokKind.String:
        return new StringLiteral(tok.loc, tok.value);
      case TokKind.Number:
        return new NumberLiteral(tok.loc, tok.value);
      case TokKind.Bool:
        return new BooleanLiteral(tok.loc, tok.value);
      case TokKind.Null:
        return new NullLiteral(tok.loc, tok.value);
      case TokKind.Undef:
        return new UndefinedLiteral(tok.loc, tok.value);
      case TokKind.Identifier: {
        let node: Expression = new Identifier(tok.loc, tok.value);
        while (true) {
          let ahead = this.lexer.peek();
          if (ahead.matchSign(Sign.ParenL)) {
            node = this.parseCallExpr(node);
          } else if (ahead.matchSign(Sign.Dot)) {
            node = this.parseMember(node);
          } else if (ahead.matchSign(Sign.BracketL)) {
            node = this.parseMemberComputed(node);
          } else break;
        }
        return node;
      }
      case TokKind.Sign: {
        if (tok.matchSign(Sign.ParenL)) {
          return this.parseParenExpr(tok);
        } else if (tok.matchSign(Sign.Minus) || tok.matchSign(Sign.Not)) {
          return this.parseUnaryExpr();
        } else if (tok.matchSign(Sign.At)) {
          return this.parseExprOnce();
        } else if (tok.matchSign(Sign.BraceL)) {
          return this.parseObjectExpr(tok);
        } else if (tok.matchSign(Sign.BracketL)) {
          return this.parseArrayExpr(tok);
        }
      }
    }
    this.raiseErr(tok);
    throw new Error("unreachable");
  }

  nextMustSign(s: string) {
    const tok = this.next();
    const ok = tok.kind === TokKind.Sign && tok.value === s;
    if (!ok) this.raiseErr(tok);
    return tok;
  }

  nextMustKeyword(k: string) {
    const tok = this.next();
    const ok = tok.kind === TokKind.Keyword && tok.value === k;
    if (!ok) this.raiseErr(tok);
    return tok;
  }

  nextMustBeKind(t: TokKind) {
    const tok = this.next();
    const ok = tok.kind === t;
    if (!ok) this.raiseErr(tok);
    return tok;
  }

  assertNext(cb: (tok: Token) => boolean) {
    const tok = this.next();
    const ok = cb(tok);
    if (!ok) this.raiseErr(tok);
    return tok;
  }

  aheadIsSign(s: string) {
    const tok = this.lexer.peek();
    return tok.kind === TokKind.Sign && tok.value === s;
  }

  parseArgs() {
    const args: Expression[] = [];
    this.nextMustSign(Sign.ParenL);
    while (true) {
      args.push(this.parseExpr());
      if (this.aheadIsSign(Sign.Comma)) {
        this.next();
      } else break;
    }
    this.nextMustSign(Sign.ParenR);
    return args;
  }

  parseCallExpr(callee: Expression) {
    const node = new CallExpression(callee.loc.clone(), callee, []);
    node.args = this.parseArgs();
    return this.finNode(node);
  }

  parseMember(object: Expression) {
    this.nextMustSign(Sign.Dot);
    const prop = this.parseIdentifier();
    const node = new MemberExpression(object.loc.clone(), object, prop, false);
    return this.finNode(node);
  }

  parseMemberComputed(object: Expression) {
    this.nextMustSign(Sign.BracketL);
    const prop = this.parseExpr();
    const node = new MemberExpression(object.loc.clone(), object, prop, true);
    return this.finNode(node);
  }

  parseArrayExpr(tok: Token) {
    const node = new ArrayExpr(tok.loc);
    while (true) {
      if (this.aheadIsSign(Sign.BracketR)) {
        this.lexer.next();
        break;
      }
      node.elements.push(this.parseExpr());
      if (this.aheadIsSign(Sign.Comma)) {
        this.lexer.next();
      }
    }
    return this.finNode(node);
  }

  parseObjectExpr(tok: Token) {
    const node = new ObjectExpr(tok.loc);
    while (true) {
      if (this.aheadIsSign(Sign.BraceR)) {
        this.lexer.next();
        break;
      }
      node.properties.push(this.parseObjectProperty());
      if (this.aheadIsSign(Sign.Comma)) {
        this.lexer.next();
        break;
      }
    }
    return this.finNode(node);
  }

  parseObjectProperty() {
    const key = this.assertNext(tok => tok.kind === TokKind.Identifier);
    this.nextMustSign(Sign.Colon);
    const value = this.parseExpr();
    return this.finNode(
      new ObjectProperty(key.loc, new Identifier(key.loc, key.value), value)
    );
  }

  parseParenExpr(tok: Token) {
    const expr = this.parseExpr();
    this.nextMustSign(Sign.ParenR);
    const node = new ParenExpression(tok.loc, expr);
    return this.finNode(node);
  }

  parseUnaryExpr() {
    const op = this.next();
    const arg = this.parseExpr();
    const node = new UnaryExpression(op.loc.clone(), op, arg);
    return this.finNode(node);
  }

  aheadIsEos() {
    const tok = this.lexer.peek();
    return tok.kind === TokKind.EOS;
  }

  parseProg() {
    this.lexer.skipWhitespace();
    const loc = this.lexer.loc;
    const prog = new Prog(loc, []);
    while (true) {
      if (this.aheadIsEos()) break;
      prog.body.push(this.parseStmt());
    }
    return this.finNode(prog);
  }

  parseStmt() {
    const tok = this.next(false);
    if (tok.matchSign("<")) {
      if (this.aheadIsComment()) return this.parseComment(tok);
      if (this.lexer.aheadIsChar("/")) return this.parseElementClose(tok);
      return this.parseElement(tok);
    } else if (tok.matchSign("{") && !this.tok.matchSign("\\")) {
      if (this.lexer.aheadIsChar("#")) return this.parseCommand(tok)!;
      if (this.lexer.aheadIsChar("/")) return this.parseCommandClose(tok)!;
      return this.parseExprStmt(tok);
    }
    return this.parseTextElement(tok);
  }

  aheadIsComment() {
    const ahead = this.lexer.src.peek(3);
    return ahead === "!--";
  }

  parseComment(tok: Token) {
    // consume `!--`
    this.src.read(3);
    const cs: string[] = [];
    while (true) {
      const c = this.src.read();
      if (c === "-" && this.src.peek(2) === "->") {
        this.src.read(2);
        break;
      }
      cs.push(c);
    }
    return this.finNode(new CommentStmt(tok.loc, cs.join("")));
  }

  parseName() {
    return this.assertNext(
      tok =>
        tok.kind === TokKind.Identifier ||
        tok.kind === TokKind.Name ||
        tok.kind === TokKind.Keyword
    );
  }

  aheadIsExprBegin() {
    return !this.tok.matchSign("\\") && this.aheadIsSign("{");
  }

  parseAttr() {
    const name = this.parseName();
    const ahead = this.src.peek();
    const attr = new TagAttr(name.loc, name.value);
    if (ahead === "=") {
      // consume `=`
      this.lexer.next();
      if (this.lexer.aheadIsChar('"') || this.lexer.aheadIsChar("'")) {
        attr.value = this.parseAtom();
      } else if (this.aheadIsSign("{")) {
        // consume `{`
        this.lexer.next();
        attr.value = this.parseExpr();
        this.nextMustSign("}");
      }
    }
    return this.finNode(attr);
  }

  parseAttrs() {
    const attrs: TagAttr[] = [];
    while (true) {
      this.lexer.skipWhitespace();
      if (this.aheadIsSign(">") || this.aheadIsSign("/")) break;
      attrs.push(this.parseAttr());
    }
    return attrs;
  }

  parseElement(tok: Token) {
    const name = this.parseName();
    const tag = new TagStatement(tok.loc, name.value);
    tag.attrs = this.parseAttrs();
    tag.selfClose = this.aheadIsSign("/");
    if (tag.selfClose) {
      // consume `/`
      this.lexer.next();
      this.nextMustSign(">");
      return tag;
    }
    this.nextMustSign(">");
    tag.body = this.parseChildren(name.value);
    return this.finNode(tag);
  }

  parseChildren(until: string) {
    const children: Statement[] = [];
    while (true) {
      const node = this.parseStmt() as MayBeCloseStmt;
      if (node.isClose) {
        if (node.name === until) break;
        this.raiseErr(this.tok);
      }
      children.push(node);
    }
    return children;
  }

  parseElementClose(tok: Token) {
    // consume `/'
    this.lexer.next();
    const name = this.parseName();
    this.nextMustSign(">");
    const node = new TagStatement(tok.loc, name.value);
    node.isClose = true;
    return this.finNode(node);
  }

  parseExprStmt(tok: Token) {
    const expr = this.parseExpr();
    this.nextMustSign("}");
    return this.finNode(new ExprStmt(tok.loc, expr));
  }

  parseTextElement(tok: Token) {
    const cs: string[] = [tok.value];
    while (true) {
      const c = this.src.peek();
      if (c === "<" || this.aheadIsExprBegin()) {
        cs.push(this.lexer.skipWhitespace());
        break;
      }
      cs.push(this.src.read());
    }
    return this.finNode(new TextStatement(tok.loc, cs.join("")));
  }

  parseCommand(tok: Token) {
    // consume `#`
    this.lexer.next();
    const name = this.assertNext(
      tok => tok.kind === TokKind.Identifier || tok.kind === TokKind.Keyword
    );
    if (name.value === "if") return this.parseIfStmt(tok);
    if (name.value === "else") return this.parseElseStmt(tok);
    if (name.value === "elseif") return this.parseElseIfStmt(tok);
    if (name.value === "list") return this.parseListStmt(tok);
    this.raiseErr(tok);
  }

  parseIfStmt(tok: Token) {
    const test = this.parseExpr();
    this.nextMustSign("}");
    const node = new IfStatement(tok.loc, test);
    let block = node.cons;
    while (true) {
      // if statement with no closing tag
      if (this.aheadIsEos()) break;
      const stmt = this.parseStmt();
      if (stmt instanceof CommandStmt) {
        if (stmt.name === CmdElse) {
          block = node.alt;
          continue;
        } else if (stmt.name === CmdElseIf) {
          node.alt = [stmt];
          break;
        } else if (stmt.name === CmdIf && stmt.isClose) break;
      }
      block.push(stmt);
    }
    return this.finNode(node);
  }

  parseElseIfStmt(tok: Token) {
    const node = this.parseIfStmt(tok);
    node.name = CmdElseIf;
    return node;
  }

  parseElseStmt(tok: Token) {
    this.nextMustSign("}");
    return this.finNode(new CommandStmt(tok.loc, CmdElse));
  }

  aheadIsKeyword(v: string) {
    const tok = this.lexer.peek();
    return tok.kind === TokKind.Keyword && v === tok.value;
  }

  parseListStmt(tok: Token) {
    const node = new ListStatement(tok.loc);

    const seq = this.parseExpr();
    node.arguments.push(seq);
    this.nextMustKeyword("as");
    const item = this.assertNext(tok => tok.kind === TokKind.Identifier);
    node.arguments.push(new Identifier(item.loc, item.value));
    if (this.aheadIsKeyword("by")) {
      const tracker = this.parseExpr();
      node.arguments.push(tracker);
    }

    let block = node.body;
    while (true) {
      const stmt = this.parseStmt();
      if (stmt instanceof CommandStmt) {
        if (stmt.name === CmdElse) {
          block = node.alt;
          continue;
        } else if (stmt.name === CmdList && stmt.isClose) break;
      }
      block.push(stmt);
    }
    return this.finNode(node);
  }

  parseCommandClose(tok: Token) {
    // consume `/`
    this.lexer.next();
    const name = this.parseName();
    this.nextMustSign("}");
    if (name.value === "if") {
      const node = new IfStatement(tok.loc, unknownExpr);
      node.isClose = true;
      return this.finNode(node);
    } else if (name.value === "list") {
      const node = new ListStatement(tok.loc);
      node.isClose = true;
      return this.finNode(node);
    }
    this.raiseErr(tok);
  }
}
