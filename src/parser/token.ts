import { SourceLoc } from "./source";

export enum TokKind {
  EOS,
  Sign,
  String,
  // for saving the content of TextNode
  Text,
  Number,
  // for the name of Element
  Name,
  Identifier,
  Keyword,
  Bool,
  Null,
  Undef
}

export class Sign {
  static Plus = "+";
  static Minus = "-";
  static Star = "*";
  static Slash = "/";
  static Modulo = "%";
  static LE = "<=";
  static GE = ">=";
  static LT = "<";
  static GT = ">";
  static Eq = "==";
  static StrictEq = "===";
  static NotEq = "!=";
  static ParenL = "(";
  static ParenR = ")";
  static BraceL = "{";
  static BraceR = "}";
  static BracketL = "[";
  static BracketR = "]";
  static Colon = ":";
  static Dot = ".";
  static Comma = ",";
  static And = "&&";
  static Or = "||";
  static Not = "!";
  static Cond = "?";
  static Assign = "=";
  static Anchor = "#";
  static At = "@";
  static Pipe = "|";
}

const precedence = new Map(
  Object.entries({
    "+": 13,
    "-": 13,
    "*": 14,
    "/": 14,
    "%": 14,
    "<=": 11,
    ">=": 11,
    "<": 11,
    ">": 11,
    "==": 10,
    "===": 10,
    "!=": 10,
    "&&": 6,
    "||": 5
  })
);

export function pcd(s: string) {
  if (precedence.has(s)) return precedence.get(s)!;
  return -1;
}

export function isAssocR(s: string) {
  return false;
}

export function isBin(s: string) {
  return precedence.has(s);
}

export class Keyword {
  static If = "if";
  static Elf = "elseif";
  static List = "list";
  static As = "as";
  static By = "by";
  static Else = "else";
}

const keywords = new Set(Object.values(Keyword));
export function isKeyword(id: string) {
  return keywords.has(id);
}

export class Token {
  kind: TokKind;
  loc: SourceLoc;
  value: string;

  constructor(kind: TokKind, loc: SourceLoc = new SourceLoc()) {
    this.kind = kind;
    this.loc = loc;
    this.value = "";
  }

  matchSign(s: string) {
    return this.kind === TokKind.Sign && this.value === s;
  }

  matchKeyword(k: string) {
    return this.kind === TokKind.Keyword && this.value === k;
  }

  isBin() {
    return this.isSign() && isBin(this.value);
  }

  pcd() {
    return pcd(this.value);
  }

  isAssocR() {
    return false;
  }

  isStr() {
    return this.kind === TokKind.String;
  }

  isId() {
    return this.kind === TokKind.Identifier;
  }

  isSign() {
    return this.kind === TokKind.Sign;
  }

  isKeyword() {
    return this.kind === TokKind.Keyword;
  }

  isEos() {
    return this.kind === TokKind.EOS;
  }

  static newName(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.Name, loc);
    tok.value = value;
    return tok;
  }

  static newId(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.Identifier, loc);
    tok.value = value;
    return tok;
  }

  static newKw(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.Keyword, loc);
    tok.value = value;
    return tok;
  }

  static newNum(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.Number, loc);
    tok.value = value;
    return tok;
  }

  static newStr(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.String, loc);
    tok.value = value;
    return tok;
  }

  static newTxt(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.Text, loc);
    tok.value = value;
    return tok;
  }

  static newSign(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.Sign, loc);
    tok.value = value;
    return tok;
  }

  static newBool(loc: SourceLoc, value: string) {
    const tok = new Token(TokKind.Bool, loc);
    tok.value = value;
    return tok;
  }

  static newNull(loc: SourceLoc) {
    const tok = new Token(TokKind.Null, loc);
    tok.value = "null";
    return tok;
  }

  static newUndef(loc: SourceLoc) {
    const tok = new Token(TokKind.Undef, loc);
    tok.value = "undefined";
    return tok;
  }
}
