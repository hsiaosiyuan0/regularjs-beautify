import { Source, EOL, SourceLoc, Position, EOS } from "./source";
import { Token, isKeyword, TokKind } from "./token";

export class Lexer {
  src: Source;

  constructor(src: Source) {
    this.src = src;
  }

  get pos() {
    return new Position(this.src.ofst, this.src.line, this.src.col);
  }

  get loc() {
    const loc = new SourceLoc();
    loc.start = this.pos;
    return loc;
  }

  next(skipWhitespace = true): Token {
    if (skipWhitespace) this.skipWhitespace();
    if (this.aheadIsEos()) return new Token(TokKind.EOS);
    if (this.aheadIsIdStart()) return this.readId();
    if (this.aheadIsNumericStart()) return this.readNumeric();
    if (this.aheadIsStringStart()) return this.readString();
    if (this.aheadIsEos()) return new Token(TokKind.EOS, this.loc);
    return this.readSign() || this.readText();
  }

  [Symbol.iterator]() {
    return {
      next: () => {
        const tok = this.next();
        return { value: tok, done: tok.isEos() };
      }
    };
  }

  peek(): Token {
    this.src.pushPos();
    const tok = this.next();
    this.src.restorePos();
    return tok;
  }

  aheadIsEos() {
    return EOS === this.src.peek();
  }

  finTok(tok: Token) {
    tok.loc.end = this.pos;
    return tok;
  }

  aheadIsIdStart() {
    return isIdStart(this.src.peek());
  }

  readId() {
    const loc = this.loc;
    const cs: string[] = [];
    let isName = false;
    while (true) {
      let c = this.src.peek();
      if (isIdPart(c)) {
        cs.push(this.src.read());
      } else if (isNamePart(c)) {
        cs.push(this.src.read());
        isName = true;
      } else break;
    }
    const value = cs.join("");
    if (isName) {
      return this.finTok(Token.newName(loc, value));
    } else if (isKeyword(value)) {
      return this.finTok(Token.newKw(loc, value));
    } else if (value === "true" || value === "false") {
      return this.finTok(Token.newBool(loc, value));
    } else if (value === "null") {
      return this.finTok(Token.newNull(loc));
    } else if (value === "undefined") {
      return this.finTok(Token.newUndef(loc));
    }
    return this.finTok(Token.newId(loc, value));
  }

  aheadIsNumericStart() {
    return isDigit(this.src.peek());
  }

  readDecimalDigits() {
    const cs: string[] = [];
    while (true) {
      let c = this.src.peek();
      if (isDigit(c)) {
        cs.push(this.src.read());
      } else break;
    }
    return cs.join("");
  }

  readExponent() {
    const cs: string[] = [];
    // consume `e` or `E`
    cs.push(this.src.read());
    const sign = this.src.peek();
    if (sign === "+" || sign === "-") {
      cs.push(this.src.read());
    }
    const ds = this.readDecimalDigits();
    if (ds.length === 0) this.raiseErr();
    cs.push(ds);
    return cs.join("");
  }

  readDecimalIntPart() {
    const c = this.src.read();
    if (c === "0") {
      return c;
    }
    return c + this.readDecimalDigits();
  }

  testAhead(c: string) {
    return c === this.src.peek();
  }

  testAheadOr(c1: string, c2: string) {
    const nc = this.src.peek();
    return c1 === nc || c2 === nc;
  }

  readDecimal() {
    let c = this.src.peek();
    const cs: string[] = [];
    const fra = c === ".";
    if (isDigit(c)) cs.push(this.readDecimalIntPart());

    if (this.testAhead(".")) {
      cs.push(this.src.read());
      const ds = this.readDecimalDigits();
      if (ds.length === 0 && fra) this.raiseErr();
      cs.push(ds);
    }

    if (this.testAheadOr("e", "E")) {
      cs.push(this.readExponent());
    }
    return cs.join("");
  }

  readHex() {
    // consume `0x` or `0X`
    const cs = [this.src.read(), this.src.read()];
    const ds: string[] = [];
    while (true) {
      let c = this.src.peek();
      if (isHexDigit(c)) {
        ds.push(this.src.read());
      } else break;
    }
    if (ds.length === 0) this.raiseErr();
    cs.push(ds.join(""));
    return cs.join("");
  }

  readNumeric() {
    const loc = this.loc;
    let isHex = false;
    let value = "";

    const c2 = this.src.peek(2);
    isHex = c2 === "0x" || c2 === "0X";

    if (isHex) value = this.readHex();
    else value = this.readDecimal();

    return this.finTok(Token.newNum(loc, value));
  }

  aheadIsStringStart() {
    let c = this.src.peek();
    return c == "'" || c == '"';
  }

  readUnicodeEscapeSeq() {
    const cs: string[] = [];
    for (let i = 0; i < 4; i++) {
      let c = this.src.read();
      if (isHexDigit(c)) cs.push(c);
      else this.raiseErr();
    }
    return cs.join("");
  }

  readStringEscapeSeq() {
    // consume `\`
    const cs = [this.src.read()];
    let c = this.src.read();
    if (isSingleEscapeCh(c)) {
      cs.push(c);
    } else if (c === "x") {
      cs.push(c);
      for (let i = 0; i < 2; i++) {
        c = this.src.read();
        if (isHexDigit(c)) cs.push(c);
        else this.raiseErr();
      }
    } else if (c === "u") {
      cs.push(c);
      cs.push(this.readUnicodeEscapeSeq());
    } else {
      this.raiseErr();
    }
    return cs.join("");
  }

  readString() {
    const loc = this.loc;
    const term = this.src.read();
    const cs: string[] = [];
    while (true) {
      let c = this.src.peek();
      if (c === term) {
        this.src.read();
        break;
      } else if (c === "\\") {
        cs.push(this.readStringEscapeSeq());
      } else {
        cs.push(this.src.read());
      }
    }
    return this.finTok(Token.newStr(loc, cs.join("")));
  }

  aheadIsChar(c: string) {
    const n = this.src.peek();
    return n === c;
  }

  readSign() {
    const loc = this.loc;
    const c = this.src.peek();
    switch (c) {
      case "<":
      case ">":
      case "=":
      case "!":
        this.src.read();
        if (this.aheadIsChar("="))
          return this.finTok(Token.newSign(loc, c + this.src.read()));
        return this.finTok(Token.newSign(loc, c));
      case "|":
        this.src.read();
        if (this.aheadIsChar("|"))
          return this.finTok(Token.newSign(loc, c + this.src.read()));
        return this.finTok(Token.newSign(loc, c));
      case "&":
        if (this.aheadIsChar("&"))
          return this.finTok(Token.newSign(loc, c + this.src.read()));
        this.raiseErr();
      case "+":
      case "-":
      case "*":
      case "%":
      case "/":
      case "(":
      case ")":
      case "{":
      case "}":
      case "[":
      case "]":
      case "?":
      case ":":
      case ",":
      case ".":
      case "#":
      case "@":
        this.src.read();
        return this.finTok(Token.newSign(loc, c));
    }
  }

  readText() {
    const loc = this.loc;
    const cs: string[] = [];
    let prev = "";
    while (true) {
      if (this.aheadIsEos()) break;
      const c = this.src.peek();
      if (c === "<") {
        break;
      } else if (c === "{" && prev !== "\\") {
        break;
      }
      prev = c;
      cs.push(this.src.read());
    }
    return this.finTok(Token.newTxt(loc, cs.join("")));
  }

  skipWhitespace() {
    const ws: string[] = [];
    while (true) {
      let c = this.src.peek();
      if (isSpace(c) || isNewline(c) || c === "\t") {
        ws.push(this.src.read());
      } else {
        break;
      }
    }
    return ws.join("");
  }

  errMsg() {
    const line = this.src.line;
    const col = this.src.col;
    return `Unexpected char ${this.src.ch} at line: ${line} column: ${col}`;
  }

  raiseErr() {
    throw new LexerError(this.errMsg());
  }
}

export function isSpace(c: string) {
  return c === " ";
}

export function isNewline(c: string) {
  return c === EOL;
}

export function isSpaceOrTab(c: string) {
  return isSpace(c) || c === "\t";
}

export function isWhitespace(c: string) {
  return isSpace(c) || isNewline(c) || c === "\t";
}

export function isLetter(c: string) {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}

export function isIdStart(c: string) {
  return isLetter(c) || c === "_" || c === "$";
}

export function isDigit(c: string) {
  return c >= "0" && c <= "9";
}

export function isHexDigit(c: string) {
  return isDigit(c) || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");
}

export function isIdPart(c: string) {
  return isIdStart(c) || isDigit(c);
}

export function isNamePart(c: string) {
  // TODO: supports `.`
  return c === "-";
}

// prettier-ignore
const singleEscapeChs = new Set(["'", '"', "\\", "b", "f", "n", "r", "t", "v", "0"]);
export function isSingleEscapeCh(c: string) {
  return singleEscapeChs.has(c);
}

export class LexerError extends Error {}
