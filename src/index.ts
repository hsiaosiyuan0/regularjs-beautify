import { Lexer, Source, Parser } from "./parser";
import { inspect } from "util";
import { writeFileSync } from "fs";
import { Formatter } from "./format";

// const code = `
// <!-- @regular -->
// <!-- @regular1 -->
//   <div id="1" a={a + b} readonly>
//   some text
//   {c + d}
//   <p>
//     <i />
//   </p>
// </div>
// `;

let code = `
{#if a > b}
  <a></a>
{#elseif a}
  <b></b>
{/if}
`;

code = `
  <div id='1'>
    {a + b}
  </div>
`;

code = `
{#if a}
  <a></a>
{#elseif b}
  <b></b>
{#elseif c}
  <c></c>
{#else}
  <d></d>
{/if}
`;

code = `
  {#list @(a + b) as c}
    <div>a</div>
  {#else}
    <a></a>
  {/list}
`;

code = `
{'add: ' + ([1,2,3] | join: '+')}
`;

code = `
{'add: ' + ({a: b + c} | join: '+')}
`;

code = `
{addEventListener(aaaaa,bbbb,cccc,dddd,eeee,fffff,ggggg,hhhh,iiiii,jjjjjj,kkkk) + addEventListener(aaaa, bbb)}
`;

code = `
{aaaaa || addEventListener(aaaaa,bbbb,cccc,dddd,eeee,fffff,ggggg,hhhh,iiiii,jjjjjj,kkkk) % cccccc}
`;

// code = `
// {aaaaa ? bbbbb : cccccc}
// `;

code = `
{addEventListener(aaaaa,bbbb,cccc,dddd,eeee,fffff,ggggg,hhhh,iiiii,jjjjjj,kkkk) ? bbbbb : cccccc}
`;

code = `
{{aaaaaaa:addEventListener(aaaaa,bbbb,cccc,dddd,eeee,fffff,ggggg,hhhh,iiiii,jjjjjj,kkkk),c:d}}
`;

code = `
{addEventListener( addEventListener(aaaaa,bbbb, cccc, dddd, eeee, fffff, ggggg, hhhh, iiiii, jjjjjj, kkkk), bbbb, cccc, dddd, eeee, fffff, ggggg, hhhh, iiiii, jjjjjj, kkkk) + addEventListener(aaaaa, bbbb, cccc, dddd, eeee, fffff, ggggg, hhhh, iiiii, jjjjjj, kkkk)}
`;

code = `
{addEventListener( addEventListener(aaaaa,bbbb, cccc, dddd, eeee, fffff, ggggg, hhhh, iiiii, jjjjjj, kkkk), bbbb, cccc, dddd, eeee, fffff, ggggg, hhhh, iiiii, jjjjjj, kkkk) + a(b)}
`;

code = `
{[aaaaaa,bbbbb,cccccc,dddddd]}
`;

code = `
{[a,!aaaaaaaaaaaaaaaaaa]}
`;

code = `
{(aaaaaa,bbbbb,cccccc,dddddd)}
`;

code = `
{aaaaaa.bbbbbb().ccccccc(hhhhh,iiiii,jjjjjj,kkkkkk).eeeee}
`;

code = `
{'add: ' + ({a: b + c}|join: '+')}
`;

code = `
{'add: ' + @(aaaaa.bbbbbb.cccc)}
`;

code = `
<div id="1" onclick={handleClick(aaa,bbb,ccc,ddd,eee,fff,ggg)}><p></p></div>
`;

code = `
<Upload
stopAuto
maxFileNum="1"
mode="picture"
text="上传图片"
accept="image/*"
value={imgObj2}
on-Error={this.onUploadError($event)}
on-Preupload={this.onPreUpload($event)}>
{a+b}
<PicList list={imgObj2}></PicList>
</Upload>
`

code =`
<FormItem label='发布时间' name='pubtime' required>
<DateTimePicker modValue={otherParams.pubTime} noDefault={true} placeholder='请选择发布时间' />
</FormItem>
<FormItem label='优秀动态' name='excellent'    required>
<Select style={{width:'100%'}} defaultValue={otherParams.excellent ||   false}>
    <Option value={false}>否   否</Option>
    <Option value={true}>是</Option>
</Select>
</FormItem>
<FormItem label='类型1' name='classification1' required>
<Select
    on-Change={this.classificationChange($event)}
    style={{width:'100%'}}
    optionList={classification1Map}
    model={otherParams.classification1|| 0} />
</FormItem>
`

code = `
{#if publishType != 'save'}
<FormItem label='水印位置' name='watermarkposition'>
    <Select style={{width:'100%'}} defaultValue={0}>
        <Option value={0}>左上</Option>
        <Option value={1}>左下</Option>
        <Option value={2}>右上</Option>
        <Option value={3}>右下</Option>
    </Select>
</FormItem>
{/if}
`

code = `
<!-- @regular -->
{#if item.mlog.auditStatus === 2}
{#if item.mlog.viewStatus === 1 || item.mlog.viewStatus === 2}
    <Button
        style={{marginTop: '5px'}}
        type="ghost"
        size="sm"
        on-click={actions.handleNormalAudit(item)}>
        {#if item.mlog.viewStatus === 1}
        <a></a>
        标记未查看
        <div></div>
        {#elseif item.mlog.viewStatus === 2}
        <a></a>
        标记已查看
        <p></p>
        {#else}
        blabla
        <div>ssssss
        ssssss
        sss</div>
        <i/>
        {/if}
    </Button>
{/if}
{/if}
`
code = `
<div>
{#if item.mlog.auditStatus === 0}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 2)}>普通推荐</Button>
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 3)}>重点推荐</Button>
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, -1)}>不推荐</Button>
{#elseif item.mlog.auditStatus === 1}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 2)}>普通推荐</Button>
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 3)}>重点推荐</Button>
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, -1)}>不推荐</Button>
{#elseif item.mlog.auditStatus === 2}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 3)}>重点推荐</Button>
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, -1)}>不推荐</Button>
{#elseif item.mlog.auditStatus === 3}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 2)}>普通推荐</Button>
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, -1)}>不推荐</Button>
{#elseif item.mlog.auditStatus === -1}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 2)}>普通推荐</Button>
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleUpdateStatus(item, 3)}>重点推荐</Button>
{/if}
{#if item.mlog.basicStatus === 1}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.shelfProduct(item)}>上架</Button>
{#elseif item.mlog.basicStatus === 0}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.lowerProduct(item)}>下架</Button>
{/if}
<Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.removeProduct(item)}>删除</Button>
<Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.handleLog(item)}><span>查看</span></Button>
</div>
`

code = `
<Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.removeProduct(item)}>删除</Button>
`

code =`
<Select style={{width:'100%'}} defaultValue={otherParams.excellent ||   false}>
    <Option value={false}>否</Option>
    <Option value={true}>是</Option>
</Select>
`

code = `
{aaaaaa[bbbbbb][ccccccc][eeeeee]}
`

code = `
<div>aaa</div>
<Button
style={{ marginTop: "5px" }}
type="ghost"
size="sm"
on-click={actions.removeProduct(item)}
>
删除
</Button>
<Button
style={{ marginTop: "5px" }}
type="ghost"
size="sm"
on-click={actions.handleLog(item)}
>
<span>
  查看</span>
</Button>
`

code = `
{#list dataSource as item}
<tag-input-item 
    itemMaxLength={itemMaxLength}
    value={item} 
    activeKeys={activeKeys}
    index={item_index}
    style={this.MOD_STYLE[size].item}
    on-Remove={this.onItemRemove($event)} 
/>
{#list dataSource as item}
<tag-input-item 
    itemMaxLength={itemMaxLength}
    value={item} 
    activeKeys={activeKeys}
    index={item_index}
    style={this.MOD_STYLE[size].item}
    on-Remove={this.onItemRemove($event)} 
/>
  <div><a></a></div>
  {#if item.mlog.basicStatus === 1}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.shelfProduct(item)}>上架</Button>
{#elseif item.mlog.basicStatus === 0}
    <Button style={{marginTop: '5px'}} type="ghost" size="sm" on-click={actions.lowerProduct(item)}>下架</Button>
{/if}
  {#else}
<div></div>
  <div></div>
{/list}
{/list}
`

// const src = new Source(code);
// const lexer = new Lexer(src);
// const parser = new Parser(lexer);

const formatter = new Formatter(code, "", 1, { printWidth: 80, baseIndent: 0 });
// for (const tok of lexer) {
//   console.log(tok);
// }

// writeFileSync("test.json", inspect(parser.parseProg(), true, null));

console.log(formatter.run());
// console.log(formatter.lines);

// addEventListener(aaaaa,bbbb,cccc,dddd,eeee,fffff,ggggg,hhhh,iiiii,jjjjjj,kkkk) + addEventListener(aaaa, bbb);

// aaaaa + bbbb + cccc + dddd + eeee+ fffff+ggggg+ hhhh+ iiiii+ jjjjjj+ kkkk+lllll+mmmmm+nnnnn;
