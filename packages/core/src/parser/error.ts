import { SourceLoc } from "./source";

export class LocatableError extends Error {
  loc: SourceLoc;

  constructor(msg: string, loc: SourceLoc) {
    super(msg);
    this.loc = loc;
  }
}
