export * from "./format";
export * from "./parser";
export * from "./visitor";

export const isTemplate = (str: string, line: number) => {
  const ret = {
    ok: false,
    indent: 0,
    line: 0
  };
  const tag = str.match(/\s*<!--\s*@regular(?:js)?\s*-->/);
  if (tag === null) return ret;

  const prevLineCnt = str.slice(0, tag.index).split(/\r?\n/).length;
  line += prevLineCnt;

  const space = tag[0].match(/^\s*/);
  const indent = space && space[0] ? space[0].length & ~1 : 2;
  return {
    ok: true,
    indent,
    line
  };
};
