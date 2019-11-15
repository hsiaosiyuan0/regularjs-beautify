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

  it("self closed", () => {
    const code = `const tpl = \`
    <!-- @regularjs -->
    <Table 
      style={{ overflowX: "auto" }}
      bordered={true}
      columns={columns}
      dataSource={dataSource}
      spinning={spinning}
      actions={actions}
      pageTotal={pageTotal}
      currentPage={currentPage}
      on-Page={this.onPage($event)}
    />\``;
    const ranges = scan(code);
    expect(ranges).to.eql([
      [2, 2],
      [4, 12]
    ]);
  });
});
