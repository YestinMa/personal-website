import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildArticleHtml, markdownToHtml } from "./sync-notion.js";

test("混合的二级列表仍位于父条目中，退出缩进后恢复原列表", () => {
  const html = markdownToHtml([
    "- 父项",
    "  1. 第一项",
    "  2. 第二项",
    "- 另一项",
    "",
    "尾段",
  ].join("\n"));
  assert.match(html, /<li>父项\s*<ol>\s*<li>第一项\s*<\/li>\s*<li>第二项\s*<\/li><\/ol>\s*<\/li>\s*<li>另一项/);
  assert.match(html, /<\/ul>\s*<p>尾段<\/p>/);
});

test("宽松列表中的缩进子项、备注及另起编号保留位置", () => {
  const html = markdownToHtml("1. 父项\n\n  - 子项\n\n    备注\n\n3. 新步骤");
  assert.match(html, /<li>父项\s*<ul>\s*<li>子项\s*<p>备注<\/p>\s*<\/li><\/ul>/);
  assert.match(markdownToHtml("3. 第三步\n4. 第四步"), /<ol start="3">/);
});

test("同一层级的不同标记不会让无编号列表吞掉后续编号", () => {
  assert.match(markdownToHtml("- 原则\n1. 步骤\n- 说明"), /<\/ul>\s*<ol>[\s\S]*<\/ol>\s*<ul>/);
});

test("多行公式整体输出，且不会把后续标题吞入公式", () => {
  const formula = String.raw`\begin{aligned}
a&=b\\
c&=d
\end{aligned}`;
  const article = buildArticleHtml({ title:"笔记", kind:"notes" }, "## 一\n\n$$"+formula+"$$\n\n## 二");
  assert.match(article, /class="math-block">\$\$\\begin\{aligned\}[\s\S]*\\end\{aligned\}\$\$<\/div>\s*<h2 id="二">二/);
  assert.ok(article.includes("katex.min.js"));
});

test("保留行内公式、原样代码和列表中的强调", () => {
  const html = markdownToHtml(["- **父项**：\\(a<b\\)","  - \x60list[-1]\x60","","\x60\x60\x60text","  - 这里是代码","\x60\x60\x60"].join("\n"));
  assert.ok(html.includes("<strong>父项</strong>：\\(a&lt;b\\)"));
  assert.ok(html.includes("<code>list[-1]</code>"));
  assert.match(html, /<pre><code[^>]*>  - 这里是代码<\/code><\/pre>/);
});