import "mocha";
import { expect } from "chai";
import { Linter } from "eslint";
import { rules } from "../src/index";

describe("init test", () => {
  it("should work", () => {
    const linter = new Linter();
    linter.defineRules(rules);
    const results = linter.verifyAndFix(
      `const tpl = \`
        <!--@regularjs-->
    <div>   </div>\`;`,
      {
        parserOptions: { ecmaVersion: 2015 },
        rules: { regularjs: ["error", 80] }
      }
    );
    expect(results.messages.length).to.equal(0);
    expect(results.output).to.equal(
      "const tpl = `\n        <!-- @regularjs -->\n        <div />`;"
    );
  });
});
