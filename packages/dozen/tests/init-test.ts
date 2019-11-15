import "mocha";
import { expect } from "chai";
import { scan } from "../src";

describe("init test", () => {
  it("should work", () => {
    const code = `const tpl = \`
    <!--@regularjs-->
<section>   
<header>   
</header>
</section>
\`;`;
    const ranges = scan(code);
    expect(ranges).to.eql([
      [2, 2],
      [3, 6],
      [4, 5]
    ]);
  });
});
