import { Lexer } from "./lexer";
import { TokKind, Token, Sign } from "./token";
import {
  Node,
  TagStatement,
  Identifier,
  TagAttr,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  UndefLiteral,
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
  ObjectProperty,
  OnceExpression
} from "./ast";
import { SourceLoc } from "./source";
import { LocatableError } from "./error";

export class Parser {
  lexer: Lexer;
  tok: Token;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.tok = new Token(TokKind.EOS);
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
        if (this.aheadIsEos()) break;

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

  parseExprOnce(tok: Token) {
    this.nextMustSign("(");
    const expr = this.parseExpr();
    this.nextMustSign(")");
    return this.finNode(new OnceExpression(tok.loc, expr));
  }

  raiseErr(tok: Token): never {
    const line = tok.loc.start.line;
    const col = tok.loc.start.column;
    throw new LocatableError(
      `Unexpected tok ${tok.value} at line: ${line} column: ${col}`,
      tok.loc
    );
  }

  raiseImbalancedTagErr(
    loc: SourceLoc,
    got: string | symbol,
    expect: string
  ): never {
    const line = loc.start.line;
    const col = loc.start.column;
    throw new LocatableError(
      `Unexpected closing tag ${String(
        got
      )} at line: ${line} column: ${col}, expect ${expect}`,
      loc
    );
  }

  parseAtom(): Expression {
    const tok = this.next();
    switch (tok.kind) {
      case TokKind.String:
        const node = new StringLiteral(tok.loc, tok.value);
        this.forbidInterpolation(node.value, node.loc);
        return node;
      case TokKind.Number:
        return new NumberLiteral(tok.loc, tok.value);
      case TokKind.Bool:
        return new BooleanLiteral(tok.loc, tok.value);
      case TokKind.Null:
        return new NullLiteral(tok.loc, tok.value);
      case TokKind.Undef:
        return new UndefLiteral(tok.loc, tok.value);
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
          return this.parseUnaryExpr(tok);
        } else if (tok.matchSign(Sign.At)) {
          return this.parseExprOnce(tok);
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
      if (this.aheadIsEos() || this.aheadIsSign(Sign.ParenR)) break;

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
    this.nextMustSign(Sign.BracketR);
    return this.finNode(node);
  }

  parseArrayExpr(tok: Token) {
    const node = new ArrayExpr(tok.loc);
    while (true) {
      if (this.aheadIsEos()) break;

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
      if (this.aheadIsEos()) break;

      if (this.aheadIsSign(Sign.BraceR)) {
        this.lexer.next();
        break;
      }
      node.properties.push(this.parseObjectProperty());
      if (this.aheadIsSign(Sign.Comma)) this.lexer.next();
    }
    return this.finNode(node);
  }

  parseObjectProperty() {
    const key = this.assertNext(
      tok => tok.kind === TokKind.Identifier || tok.kind === TokKind.String
    );
    this.nextMustSign(Sign.Colon);
    const value = this.parseExpr();
    return this.finNode(
      new ObjectProperty(key.loc, new Identifier(key.loc, key.value), value)
    );
  }

  parseParenExpr(tok: Token) {
    const exprs: Expression[] = [];
    while (true) {
      if (this.aheadIsSign(Sign.ParenR) || this.aheadIsEos()) break;
      exprs.push(this.parseExpr());
      if (this.aheadIsSign(",")) this.lexer.next();
    }
    this.nextMustSign(Sign.ParenR);
    const node = new ParenExpression(tok.loc, exprs);
    return this.finNode(node);
  }

  parseUnaryExpr(tok: Token) {
    const arg = this.parseExpr();
    const node = new UnaryExpression(tok.loc, tok, arg);
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
      if (this.aheadIsEos()) break;

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
      if (this.aheadIsEos()) break;

      const spaces = this.lexer.skipWhitespace();
      if (this.aheadIsSign(">") || this.aheadIsSign("/")) break;

      if (spaces.length === 0) this.raiseErr(this.tok);
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
      return this.finNode(tag);
    }
    this.nextMustSign(">");
    tag.body = this.parseChildren(name.value);
    return this.finNode(tag);
  }

  parseChildren(until: string) {
    const children: Statement[] = [];
    while (true) {
      if (this.aheadIsEos()) break;

      const node = this.parseStmt() as MayBeCloseStmt;
      if (node.isClose) {
        if (node.name === until) break;
        this.raiseImbalancedTagErr(node.loc, node.name, until);
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
    const cs: string[] = [tok.value.trim()];
    while (true) {
      if (this.aheadIsEos()) break;

      const c = this.src.peek();
      if (c === "\\") {
        cs.push(this.src.read(2));
      } else if (c === "<" || this.aheadIsExprBegin()) {
        if (this.aheadIsExprBegin() && cs[cs.length - 1] === "$") {
          this.raiseJsInterpolationErr(this.lexer.loc);
        }
        cs.push(this.lexer.skipWhitespace());
        break;
      }
      cs.push(this.src.read());
    }

    const str = cs.join("");
    this.forbidInterpolation(str, tok.loc);
    return this.finNode(new TextStatement(tok.loc, str));
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
      if (this.aheadIsEos()) break;

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

  raiseJsInterpolationErr(loc: SourceLoc) {
    throw new LocatableError(
      "Using javascript interpolation in template is forbidden",
      loc
    );
  }

  // Firstly, interpolation is beginning with `${`, below we call it DB(Dollar-Brace) for short.
  // If DB appears in code except string literal, it will be recognized as deformed token.
  // However, DB will be recognized as the legal content of string if it appears in the sequence
  // of string characters, we should close this passage to disable using interpolation in template.
  // Using interpolation in template will cause the scope semantics of template to be obscure,
  // user shall consider the scope of template own and the scope of interpolation whose scope is belong
  // to the outer isolate Javascript
  forbidInterpolation(str: string, loc: SourceLoc) {
    const db = str.match(/(?=[^\\])\$\{/);
    if (db === null) return;
    loc.start.column += db.index!;
    this.raiseJsInterpolationErr(loc);
  }
}
