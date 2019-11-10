import {
  ExprStmt,
  Statement,
  BinaryExpression,
  MemberExpression,
  CallExpression,
  ObjectExpression,
  ObjectProperty,
  ParenExpression,
  TernaryExpression,
  Expression,
  NodeType,
  Literal,
  Node,
  Token,
  emptyLoc,
  ArrayExpr,
  PipeExpression,
  OnceExpression,
  TagStatement,
  TagAttr,
  TextStatement
} from "../parser";
import { Line, line_, link_, lines_ } from "./line";
import { Formatter } from "./format";

export const shrinkLines = (formatter: Formatter, lines: Line[]) => {
  let work = lines.slice(0);
  let buf: Line[] = [];
  let first = lines[0];

  do {
    for (let i = 0; i < work.length; i++) {
      const line = work[i];
      if (line.fine) continue;
      line.fine =
        line.text.length + line.indent <= formatter.options.printWidth;
      if (line.fine) continue;

      const newLines = shrink(formatter, line);
      link_(lines_(line.prev, newLines, line.next));

      buf = buf.concat(newLines);
      if (!newLines[0].prev) first = newLines[0];
    }
    work = buf;
    buf = [];
  } while (work.length);

  return first;
};

export const isShrinkable = (
  node: Token | Statement | Expression
): node is Statement | Expression => {
  if (node instanceof Token) return false;
  if (node instanceof Statement) return true;
  return (
    node.type !== NodeType.Identifier &&
    node.type !== NodeType.UnaryExpr &&
    !(node instanceof Literal)
  );
};

export const combine = (
  formatter: Formatter,
  nodes: Array<Token | Statement | Expression>
) => {
  return nodes
    .map(node => {
      if (node instanceof Token) return node.value;
      if (node instanceof Statement) return formatter.visitStmt(node);
      return formatter.visitExpr(node);
    })
    .join("");
};

export const shrink = (formatter: Formatter, line: Line): Line[] => {
  const i = line.nodes.findIndex(isShrinkable);
  if (i === -1) {
    line.fine = true;
    return [line];
  }

  const before = line.nodes.slice(0, i);
  const after = line.nodes.slice(i + 1);

  let beforeLine: Line | undefined;
  if (before.length)
    beforeLine = line_(
      combine(formatter, before),
      before,
      line.indent,
      line.force
    );

  const node = line.nodes[i];
  let newLines = shrinkNode(formatter, node as any, line.indent);

  let afterLine: Line | undefined;
  if (after.length) {
    afterLine = line_(combine(formatter, after), after, line.indent, false);
  }

  // if the open part of tag is shrunk then its text children should
  // force to take a whole line
  if (node instanceof TagStatement && !node.selfClose) {
    if (line.next && line.next.nodes.length === 1) {
      const first = line.next.nodes[0];
      if (first instanceof TextStatement || first instanceof Token) {
        line.next.force = true;
        line.next.steel = true;
      }
    }
  }

  return link_(lines_(beforeLine, newLines, afterLine));
};

export const shrinkNode = (
  formatter: Formatter,
  node: Node,
  indent = 0
): Line[] => {
  return shrinkers[node.type](formatter, node, indent);
};

export const sign_ = (s: string) => Token.newSign(emptyLoc, s);

export const shrinkers = {
  [NodeType.BinaryExpr](
    formatter: Formatter,
    node: BinaryExpression,
    indent = 0
  ) {
    const left = formatter.visitExpr(node.left);
    const op = node.op.value;
    const line1 = line_(
      `${left} ${op}`,
      [node.left, node.op],
      indent,
      false,
      true
    );
    const line2 = line_(
      formatter.visitExpr(node.right),
      [node.right],
      indent + 2
    );
    link_([line1, line2]);
    return [line1, line2];
  },
  seq(formatter: Formatter, exprs: Expression[], indent = 0) {
    const len = exprs.length;
    return exprs.map((expr, i) => {
      const nodes: Array<Token | Expression> = [expr];
      if (i < len - 1) nodes.push(sign_(","));
      return line_(combine(formatter, nodes), nodes, indent, true);
    });
  },
  [NodeType.CallExpr](formatter: Formatter, node: CallExpression, indent = 0) {
    const callee = formatter.visitExpr(node.callee);
    const line1 = line_(`${callee}(`, [node.callee, sign_("(")], indent);
    line1.inline = true;
    const seqLines = shrinkers.seq(formatter, node.args, indent + 2);
    const line2 = line_(")", [sign_(")")], indent, true);
    return link_(lines_(line1, seqLines, line2));
  },
  [NodeType.TernaryExpr](
    formatter: Formatter,
    node: TernaryExpression,
    indent = 0
  ) {
    const test = formatter.visitExpr(node.test);
    const cons = formatter.visitExpr(node.cons);
    const alt = formatter.visitExpr(node.alt);
    const line1 = line_(`${test}`, [node.test], indent, false, true);
    const line2 = line_(`? ${cons}`, [sign_("?"), node.cons], indent + 2, true);
    const line3 = line_(`: ${alt}`, [sign_(":"), node.alt], indent + 2, true);
    return link_(lines_(line1, line2, line3));
  },
  [NodeType.ObjectExpr](
    formatter: Formatter,
    node: ObjectExpression,
    indent = 0
  ) {
    const begin = line_("{", [sign_("{")], indent, true);
    const propsLines = shrinkers.seq(
      formatter,
      node.properties as any,
      indent + 2
    );
    const close = line_("}", [sign_("}")], indent, true);
    return link_(lines_(begin, propsLines, close));
  },
  [NodeType.ObjectProperty](
    formatter: Formatter,
    node: ObjectProperty,
    indent = 0
  ) {
    const compress = combine(formatter, [
      node.key,
      sign_(":"),
      sign_(" "),
      node.value
    ]);
    if (indent + compress.length < formatter.options.printWidth) {
      return lines_(
        line_(
          compress,
          [node.key, sign_(":"), node.value],
          indent,
          true,
          true,
          true
        )
      );
    }
    const keyNodes = [node.key, sign_(":"), sign_(" ")];
    const keyLine = line_(combine(formatter, keyNodes), keyNodes, indent);
    const valueLines = shrinkNode(formatter, node.value, indent);
    const first = valueLines.shift()!;

    keyLine.text += first.text;
    keyLine.fine = true;
    keyLine.nodes = keyLine.nodes.concat(first.nodes);

    return link_(lines_(keyLine, valueLines));
  },
  [NodeType.ArrayExpr](formatter: Formatter, node: ArrayExpr, indent = 0) {
    const begin = line_("[", [sign_("[")], indent, false, true);
    const items = shrinkers.seq(formatter, node.elements as any, indent + 2);
    const close = line_("]", [sign_("]")], indent, true);
    return link_(lines_(begin, items, close));
  },
  [NodeType.ParenExpr](
    formatter: Formatter,
    node: ParenExpression,
    indent = 0
  ) {
    const begin = line_("(", [sign_("(")], indent, true);
    const items = shrinkers.seq(formatter, node.exprs as any, indent + 2);
    items[0].force = false;
    const close = line_(")", [sign_(")")], indent);
    return link_(lines_(begin, items, close));
  },
  [NodeType.MemberExpr](
    formatter: Formatter,
    node: MemberExpression,
    indent = 0
  ) {
    if (!node.computed) {
      const line1Nodes = [node.object];
      const line1 = line_(combine(formatter, line1Nodes), line1Nodes, indent);
      const line2Nodes = [sign_("."), node.property];
      const line2 = line_(
        combine(formatter, line2Nodes),
        line1Nodes,
        indent + 2
      );
      return link_(lines_(line1, line2));
    }
    const line1Nodes = [node.object, sign_("[")];
    const line1 = line_(combine(formatter, line1Nodes), line1Nodes, indent);
    const line2Nodes = [node.property];
    const line2 = line_(
      combine(formatter, line2Nodes),
      line2Nodes,
      indent + 2,
      true
    );
    const line3 = line_("]", [sign_("]")], indent, true);
    return link_(lines_(line1, line2, line3));
  },
  [NodeType.PipeExpr](formatter: Formatter, node: PipeExpression, indent = 0) {
    const exprNodes = [node.expr];
    const exprLine = line_(combine(formatter, exprNodes), exprNodes, indent);
    let cmdNodes: Array<Token | Expression> = [sign_("| "), sign_(node.name)];
    if (node.args.length) cmdNodes.push(sign_(": "));
    cmdNodes = cmdNodes.concat(node.args);
    const cmdLine = line_(combine(formatter, cmdNodes), cmdNodes, indent + 2);
    return link_(lines_(exprLine, cmdLine));
  },
  [NodeType.OnceExpr](formatter: Formatter, node: OnceExpression, indent = 0) {
    const begin = line_("@(", [sign_("@"), sign_("(")], indent, true);
    const expr = line_(
      combine(formatter, [node.expr]),
      [node.expr],
      indent + 2
    );
    const close = line_(")", [sign_(")")], indent);
    return link_(lines_(begin, expr, close));
  },
  [NodeType.ExprStmt](formatter: Formatter, node: ExprStmt, indent = 0) {
    const line1 = line_(`{`, [sign_("{")], indent, true, true);
    const line2 = line_(
      formatter.visitExpr(node.value),
      [node.value],
      indent + 2
    );
    const line3 = line_("}", [sign_("}")], indent, true);
    return link_(lines_(line1, line2, line3));
  },
  [NodeType.TagAttr](formatter: Formatter, node: TagAttr, indent = 0) {
    const name = node.name;
    if (!node.value) return line_(name, [node], indent, true, true, true);

    const nodes: Array<Token | Expression> = [sign_(node.name), sign_("=")];
    if (node.value.type !== NodeType.StringLiteral) nodes.push(sign_("{"));
    nodes.push(node.value);
    if (node.value.type !== NodeType.StringLiteral) nodes.push(sign_("}"));
    return line_(combine(formatter, nodes), nodes, indent, true, true);
  },
  [NodeType.TagStmt](formatter: Formatter, node: TagStatement, indent = 0) {
    const begin = line_(
      `<${node.name} `,
      [sign_(node.name)],
      indent,
      true,
      true,
      true
    );
    const attrLines = node.attrs.map(attr =>
      shrinkers[NodeType.TagAttr](formatter, attr, indent + 2)
    );
    const closeNodes = [sign_(">")];
    if (node.selfClose) closeNodes.unshift(sign_("/"));
    const close = line_(
      combine(formatter, closeNodes),
      closeNodes,
      indent,
      true,
      true,
      true
    );
    return link_(lines_(begin, attrLines, close));
  }
};
