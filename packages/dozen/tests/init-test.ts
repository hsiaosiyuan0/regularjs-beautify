import "mocha";
import { expect } from "chai";
import { scan, format } from "../src";

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
      [4, 5],
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
      [4, 13],
    ]);
  });

  it("same line start and attrs", () => {
    const code = `const tpl = \`
    <!-- @regularjs -->
    <Table style={{ overflowX: "auto" }} bordered={true}>
    <div></div>
    </Table>\``;
    const ranges = scan(code);
    expect(ranges).to.eql([
      [2, 2],
      [3, 5],
      [4, 4],
    ]);
  });

  it("error line", () => {
    const code = `import Base from "../base";
import _ from "../util/helper";

const tpl = \`<!-- @regular -->
<div class="mui-breadcrumb {class} ${1}"
      r-style={style}>
    {#inc this.$body}
</div>
\`;
`;
    expect(() => format("", code)).to.throw(
      "Unexpected tok { at line: 7 column: 4"
    );
  });
});
