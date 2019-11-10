import { Formatter } from "regularjs-beautify-core";
import { Rule } from "eslint";
import { Node } from "estree";

const meta = {
  type: "layout" as any,
  docs: {
    description: "beautify regularjs",
    category: "Stylistic Issues",
    recommended: true,
    url: "https://github.com/hsiaosiyuan0/regularjs-beautify"
  },
  fixable: "code" as any
};

const create = (ctx: Rule.RuleContext) => {
  const printWidth = ctx.options[0] || 80;

  return {
    TemplateLiteral(node: Node) {
      const str = ctx.getSourceCode().getText(node);
      const code = str.slice(1, -1);
      const tag = code.match(/\s*<!--\s*@regularjs\s*-->/);
      if (tag === null) return;

      let beginLine = node.loc!.start.line;
      const precedingLines = str.slice(0, tag.index).split(/\r?\n/).length;
      beginLine += precedingLines;

      const space = tag[0].match(/^\s*/);
      const baseIndent = space && space[0] ? space[0].length & ~1 : 2;
      const formatter = new Formatter(code, ctx.getFilename(), beginLine, {
        baseIndent,
        printWidth
      });
      try {
        const formatted = formatter.run();
        const output = `\n${formatted}`;
        if (output === code) return;
        ctx.report({
          node: node,
          message: "poor style used in template",
          fix(fixer: Rule.RuleFixer) {
            return fixer.replaceTextRange(node.range!, `\`${output}\``);
          }
        });
      } catch (e) {
        ctx.report({
          node,
          message: e.message
        });
      }
    }
  };
};

export const regularjs: Rule.RuleModule = {
  meta,
  create
};

export const rules = {
  regularjs
};
