import { Formatter, isTemplate } from "regularjs-beautify-core";
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
      const str = ctx
        .getSourceCode()
        .getText(node)
        .slice(1, -1);
      const { ok, indent, line } = isTemplate(str, node.loc!.start.line);
      if (!ok) return;

      const formatter = new Formatter(str, ctx.getFilename(), line, {
        baseIndent: indent,
        printWidth
      });
      try {
        const output = "\n" + formatter.run();
        if (output === str) return;
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
