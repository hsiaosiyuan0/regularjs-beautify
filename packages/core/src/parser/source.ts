import { LocatableError } from "./error";

export const NL = "\n";
export const CR = "\r";
export const EOL = "\n";
export const EOS = "\x03";

export class Position {
  ofst: number;
  line: number;
  column: number;

  constructor(ofst = -1, line = 1, column = 0) {
    this.ofst = ofst;
    this.line = line;
    this.column = column;
  }

  clone() {
    return new Position(this.ofst, this.line, this.column);
  }
}

export class Source {
  code: string;
  file: string;
  ch: string;
  ofst: number;
  line: number;
  col: number;
  isPeek: boolean;
  posStack: Position[];

  constructor(code = "", file = "", startLine = 1) {
    this.code = code;
    this.file = file;
    this.ch = "";
    this.ofst = -1;
    this.line = startLine;
    this.col = 0;
    this.isPeek = false;
    this.posStack = [];
  }

  get pos() {
    return new Position(this.ofst, this.line, this.col);
  }

  read(cnt = 1) {
    const ret: string[] = [];
    let ofst = this.ofst;
    let c: string | undefined;
    while (cnt) {
      const next = ofst + 1;
      c = this.code[next];
      if (c === undefined) {
        c = EOS;
        ret.push(c);
        break;
      }
      ofst = next;
      if (c === CR || c === NL) {
        if (c === CR && this.code[next + 1] === NL) ofst++;
        if (!this.isPeek) {
          this.line++;
          this.col = 0;
        }
        c = EOL;
      } else if (!this.isPeek) this.col++;
      ret.push(c);
      cnt--;
    }
    if (!this.isPeek) {
      this.ch = c!;
      this.ofst = ofst;
    }
    return ret.join("");
  }

  peek(cnt = 1) {
    this.isPeek = true;
    const ret = this.read(cnt);
    this.isPeek = false;
    return ret;
  }

  pushPos() {
    this.posStack.push(this.pos);
  }

  restorePos() {
    const pos = this.posStack.pop();
    if (pos === undefined)
      throw new LocatableError(
        "Unbalanced popping of position stack",
        new SourceLoc(this.file, this.pos)
      );

    this.ofst = pos.ofst;
    this.line = pos.line;
    this.col = pos.column;
  }
}

export class SourceLoc {
  source: string;
  start: Position;
  end: Position;

  constructor(source = "", start = emptyPos, end = emptyPos) {
    this.source = source;
    this.start = start;
    this.end = end;
  }

  clone() {
    return new SourceLoc(this.source, this.start.clone(), this.end.clone());
  }
}

export const emptyPos = new Position(-1, -1, -1);
export const emptyLoc = new SourceLoc(undefined, emptyPos, emptyPos);
