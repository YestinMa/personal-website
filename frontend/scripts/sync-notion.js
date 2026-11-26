import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FRONTEND_DIR, "..");
const CONTENT_RENDER_VERSION = "9";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const PUBLISHED_STATUSES = new Set(["published", "public", "ready"]);

async function loadEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getConfig() {
  const syncMode = (process.env.NOTION_SYNC_MODE || "").trim().toLowerCase() || "database";
  const contentDirName = (process.env.SITE_CONTENT_DIR || "content").trim();
  const notionToken = getRequiredEnv("NOTION_TOKEN");
  const contentRoot = path.resolve(REPO_ROOT, contentDirName);

  if (!["database", "page"].includes(syncMode)) {
    throw new Error(`Unsupported NOTION_SYNC_MODE: ${syncMode}`);
  }

  if (syncMode === "database") {
    return {
      notionToken,
      syncMode,
      contentRoot,
      databaseId: getRequiredEnv("NOTION_DATABASE_ID"),
      rootPageId: process.env.NOTION_ROOT_PAGE_ID || "",
    };
  }

  return {
    notionToken,
    syncMode,
    contentRoot,
    databaseId: process.env.NOTION_DATABASE_ID || "",
    rootPageId: getRequiredEnv("NOTION_ROOT_PAGE_ID"),
  };
}

async function notionRequest(token, apiPath, init = {}) {
  const url = new URL(`${NOTION_API_BASE}${apiPath}`);
  const method = init.method || "GET";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };

  // 同步只读操作可安全重试，避免临时限流或连接重置中断长笔记。
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        method, headers,
        ...(init.body ? { body: init.body } : {}),
        signal: AbortSignal.timeout(30000),
      });
      const body = await response.text();
      if (response.ok) return JSON.parse(body);
      if (attempt === 4 || (response.status !== 429 && response.status < 500)) {
        throw new Error(`Notion API request failed: ${response.status} ${body.slice(0, 300)}`);
      }
    } catch (error) {
      const transient = ["ECONNRESET", "ETIMEDOUT", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT"].includes(error.cause?.code);
      if (attempt === 4 || (!transient && error.name !== "TimeoutError")) throw error;
    }
    const retryAfter = Number(response?.headers.get("Retry-After")) || 0;
    await new Promise((resolve) => setTimeout(resolve, Math.max(1000 * attempt, 1000 * retryAfter)));
  }
}

async function listBlockChildren(token, blockId) {
  const results = [];
  let cursor;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) {
      query.set("start_cursor", cursor);
    }
    const data = await notionRequest(token, `/blocks/${blockId}/children?${query.toString()}`);
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function queryDatabase(token, databaseId) {
  const results = [];
  let cursor;

  do {
    const data = await notionRequest(token, `/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function retrievePage(token, pageId) {
  return notionRequest(token, `/pages/${pageId}`);
}

async function retrieveDatabase(token, databaseId) {
  return notionRequest(token, `/databases/${databaseId}`);
}

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

function slugify(value) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "untitled";
}

function escapeInlineMarkdown(text) {
  // 普通圆括号不是 Markdown 控制符，转义后会与 KaTeX 的行内公式定界符冲突。
  return text.replace(/([\\`*_{}\[\]#+\-.!|>])/g, "\\$1");
}

function richTextToMarkdown(richText = []) {
  return richText
    .map((item) => {
      // Notion 的行内公式需要转成 LaTeX 定界符，浏览器端才能正确渲染。
      if (item.type === "equation") {
        return `\\(${item.equation?.expression || ""}\\)`;
      }

      if (item.type !== "text") {
        return item.plain_text || "";
      }

      let text = escapeInlineMarkdown(item.plain_text || "");
      const { annotations, href } = item;

      if (annotations.code) text = `\`${text}\``;
      if (annotations.bold) text = `**${text}**`;
      if (annotations.italic) text = `*${text}*`;
      if (annotations.strikethrough) text = `~~${text}~~`;

      if (href) {
        text = `[${text}](${href})`;
      }

      return text;
    })
    .join("");
}

function richTextToPlainText(richText = []) {
  return richText.map((item) => item.plain_text || "").join("");
}

function getPropertyValue(property) {
  switch (property?.type) {
    case "title":
      return normalizeText(richTextToMarkdown(property.title));
    case "rich_text":
      return normalizeText(richTextToMarkdown(property.rich_text));
    case "status":
      return property.status?.name || "";
    case "select":
      return property.select?.name || "";
    case "multi_select":
      return property.multi_select?.map((item) => item.name) || [];
    case "date":
      return property.date?.start || "";
    case "checkbox":
      return property.checkbox;
    case "url":
      return property.url || "";
    default:
      return "";
  }
}

function findProperty(properties, matchers) {
  for (const [name, property] of Object.entries(properties || {})) {
    const normalized = name.trim().toLowerCase();
    if (matchers.includes(normalized)) {
      return getPropertyValue(property);
    }
  }
  return "";
}

function inferKindFromText(value) {
  const normalized = (value || "").trim().toLowerCase();
  if (["blog", "blogs", "post", "posts"].includes(normalized)) return "blog";
  if (["note", "notes"].includes(normalized)) return "notes";
  return "";
}

function inferKindFromAncestors(ancestors) {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const kind = inferKindFromText(ancestors[index]);
    if (kind) return kind;
  }
  return "";
}

function parsePageMeta(page, ancestors = [], defaultStatus = "") {
  const properties = page.properties || {};
  const title =
    findProperty(properties, ["title", "name"]) ||
    page.child_page?.title ||
    "Untitled";
  const status = String(findProperty(properties, ["status", "state", "visibility"]) || defaultStatus || "").trim();
  const tags = findProperty(properties, ["tags", "tag"]);
  const category = findProperty(properties, ["category", "categories", "section"]);
  const explicitKind = inferKindFromText(findProperty(properties, ["type", "kind", "collection", "content type"]));
  const kind = explicitKind || inferKindFromText(category) || inferKindFromAncestors(ancestors);
  const slugSource = findProperty(properties, ["slug", "path"]) || title;
  const date = findProperty(properties, ["date", "publish date", "published", "published at"]) || page.created_time;

  return {
    title,
    status,
    tags: Array.isArray(tags) ? tags : [],
    category: Array.isArray(category) ? category[0] : category || "",
    kind,
    slug: slugify(slugSource),
    date,
    lastEditedTime: page.last_edited_time,
    notionPageId: page.id,
    ancestors,
  };
}

function isPublishedStatus(status) {
  return PUBLISHED_STATUSES.has((status || "").trim().toLowerCase());
}

async function walkPageTree(token, pageId, ancestors = [], buckets = []) {
  const blocks = await listBlockChildren(token, pageId);

  for (const block of blocks) {
    if (block.type === "child_page") {
      const childPage = await retrievePage(token, block.id);
      const currentAncestors = [...ancestors, block.child_page.title];
      const childBlocks = await listBlockChildren(token, block.id);
      const isContainer =
        Object.keys(childPage.properties || {}).length <= 1 &&
        childBlocks.some((childBlock) => childBlock.type === "child_page" || childBlock.type === "child_database");
      buckets.push({
        page: childPage,
        ancestors: currentAncestors,
        defaultStatus: isContainer ? "" : "Published",
        isContainer,
      });
      await walkPageTree(token, block.id, currentAncestors, buckets);
    }

    if (block.type === "child_database") {
      const database = await retrieveDatabase(token, block.id);
      const databaseTitle = normalizeText(richTextToMarkdown(database.title));
      const currentAncestors = [...ancestors, databaseTitle];
      const entries = await queryDatabase(token, block.id);
      for (const entry of entries) {
        buckets.push({ page: entry, ancestors: currentAncestors, defaultStatus: "", isContainer: false });
      }
    }
  }

  return buckets;
}

function getBlockText(block, key) {
  return richTextToMarkdown(block[key]?.rich_text || []);
}

function getImageSource(image) {
  if (image.type === "external") return image.external.url;
  if (image.type === "file") return image.file.url;
  return "";
}

function getExtensionFromUrl(url) {
  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    if (/^\.[a-z0-9]+$/.test(extension)) {
      return extension;
    }
  } catch {
    return "";
  }
  return "";
}

function getExtensionFromContentType(contentType) {
  const normalized = String(contentType || "").split(";")[0].trim().toLowerCase();
  const mapping = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
  };
  return mapping[normalized] || "";
}

async function downloadFile(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) {
        await response.body?.cancel();
        const error = new Error(`Image download failed: ${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") || "",
      };
    } catch (error) {
      const transient = ["ECONNRESET", "ETIMEDOUT", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT"].includes(error.cause?.code);
      if (attempt === 3 || (!transient && error.name !== "TimeoutError" && !error.retryable)) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
}

async function localizeImage(image, context) {
  const sourceUrl = getImageSource(image);
  if (!sourceUrl || image.type !== "file") {
    return sourceUrl;
  }

  try {
    const downloaded = await downloadFile(sourceUrl);
    const imageIndex = context.nextImageIndex();
    const extension = getExtensionFromContentType(downloaded.contentType) || getExtensionFromUrl(sourceUrl) || ".img";
    if (context.strictImages && (extension === ".img" || !downloaded.buffer.length)) {
      throw new Error("Unexpected image format or empty image");
    }
    const fileName = `image-${String(imageIndex).padStart(2, "0")}${extension}`;
    const targetPath = path.join(context.assetDir, fileName);

    await fs.mkdir(context.assetDir, { recursive: true });
    await fs.writeFile(targetPath, downloaded.buffer);

    // HTML 文件位于 notes/ 或 blog/，因此本地图片用相对站点根目录的路径引用。
    return `${context.assetHrefBase}/${fileName}`;
  } catch (error) {
    if (context.strictImages) {
      throw new Error("Notion 图片本地化失败；发布产物不能引用会过期的签名 URL。", { cause: error });
    }
    console.warn(`Unable to localize Notion image, falling back to signed URL: ${error.message}`);
    return sourceUrl;
  }
}

async function renderBlocks(token, blocks, context, depth = 0) {
  const lines = [];

  for (const block of blocks) {
    const children = block.has_children ? await listBlockChildren(token, block.id) : [];
    const indent = "  ".repeat(depth);

    switch (block.type) {
      case "heading_1":
        lines.push(`# ${getBlockText(block, "heading_1")}`, "");
        break;
      case "heading_2":
        lines.push(`## ${getBlockText(block, "heading_2")}`, "");
        break;
      case "heading_3":
        lines.push(`### ${getBlockText(block, "heading_3")}`, "");
        break;
      case "heading_4":
        lines.push(`#### ${getBlockText(block, "heading_4")}`, "");
        break;
      case "paragraph":
        lines.push(`${indent}${getBlockText(block, "paragraph")}`, "");
        break;
      case "bulleted_list_item":
        lines.push(`${indent}- ${getBlockText(block, "bulleted_list_item")}`);
        if (children.length) {
          const nested = await renderBlocks(token, children, context, depth + 1);
          lines.push(nested.trimEnd());
        }
        break;
      case "numbered_list_item":
        lines.push(`${indent}1. ${getBlockText(block, "numbered_list_item")}`);
        if (children.length) {
          const nested = await renderBlocks(token, children, context, depth + 1);
          lines.push(nested.trimEnd());
        }
        break;
      case "quote":
        lines.push(`${indent}> ${getBlockText(block, "quote")}`, "");
        if (children.length) lines.push((await renderBlocks(token, children, context, depth)).trimEnd(), "");
        break;
      case "code": {
        const language = block.code.language || "";
        const content = richTextToPlainText(block.code.rich_text);
        lines.push(`\`\`\`${language}`, content, "```", "");
        break;
      }
      case "equation":
        // 独立公式块使用 display math，避免和普通段落混在一起。
        lines.push(`$$${block.equation?.expression || ""}$$`, "");
        break;
      case "image": {
        const url = await localizeImage(block.image, context);
        const caption = richTextToMarkdown(block.image.caption || []);
        lines.push(`![${caption}](${url})`, "");
        break;
      }
      case "table": {
        // Notion 表格的行保存在子块中，按单元格顺序转为 Markdown 表格。
        const rows = children.filter((child) => child.type === "table_row")
          .map((row) => (row.table_row?.cells || []).map((cell) => richTextToMarkdown(cell).replace(/\|/g, "\\|")));
        if (rows.length) {
          const width = block.table?.table_width || Math.max(...rows.map((row) => row.length));
          const formatRow = (row) => `| ${Array.from({ length: width }, (_, index) => row[index] || "").join(" | ")} |`;
          lines.push(formatRow(rows[0]), formatRow(Array(width).fill("---")), ...rows.slice(1).map(formatRow), "");
        }
        break;
      }
      case "bookmark":
        lines.push(`[${block.bookmark.url}](${block.bookmark.url})`, "");
        break;
      case "divider":
        lines.push("---", "");
        break;
      default:
        lines.push(`<!-- Unsupported Notion block: ${block.type} -->`, "");
        if (children.length) {
          const nested = await renderBlocks(token, children, context, depth);
          lines.push(nested.trimEnd(), "");
        }
        break;
    }
  }

  const joined = lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  return `${depth ? joined : joined.trimStart()}\n`;
}

function toFrontmatter(meta) {
  const payload = {
    title: meta.title,
    slug: meta.slug,
    date: meta.date,
    lastEditedTime: meta.lastEditedTime,
    renderVersion: CONTENT_RENDER_VERSION,
    category: meta.category || meta.kind,
    tags: meta.tags,
    status: meta.status,
    notionPageId: meta.notionPageId,
  };

  const lines = Object.entries(payload).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${JSON.stringify(value ?? "")}`;
  });

  return `---\n${lines.join("\n")}\n---\n\n`;
}

function getHtmlOutputPath(meta) {
  return path.join(REPO_ROOT, meta.kind, `${meta.slug}.html`);
}

function getAssetOutputDir(meta) {
  return path.join(REPO_ROOT, "content", "assets", meta.kind, meta.slug);
}

function getAssetHrefBase(meta) {
  return `../content/assets/${meta.kind}/${meta.slug}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function containsMath(markdown) {
  return /\\\(|\\\[|\$\$[\s\S]*?\$\$/.test(markdown);
}

function restoreModelNotationParentheses(text) {
  // 兼容旧同步结果：模型名后的普通括号曾被误写成 KaTeX 定界符。
  return text.replace(/\b([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)?)\\\(([^()\r\n]+)\\\)/g, (match, model, expression) => {
    const isModelOrder = /^(?:[A-Za-z0-9,.+\-\s]|∞|\\infty)+$/.test(expression);
    return isModelOrder ? `${model}(${expression})` : match;
  });
}

function parseInlineMarkdown(text) {
  // 先把公式片段占位，避免后续的转义和强调解析破坏 KaTeX 所需分隔符。
  const protectedSegments = [];
  const placeholderPrefix = "__INLINE_TOKEN_";
  const normalizedText = restoreModelNotationParentheses(text);
  const withPlaceholders = normalizedText.replace(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|`[^`]+`)/g, (segment) => {
    const placeholder = `${placeholderPrefix}${protectedSegments.length}__`;
    protectedSegments.push(segment);
    return placeholder;
  });

  let html = escapeHtml(withPlaceholders);
  // 表格单元格里的显式换行只放行 br 标签，其他 HTML 仍按文本转义。
  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/(?<!\\)\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\\)\*([^*\n]+)\*/g, "<em>$1</em>");
  html = html.replace(/(?<!\\)~~([^~\n]+)~~/g, "<del>$1</del>");
  html = html.replace(/\\([\\`*_{}\[\]()#+\-.!|>])/g, "$1");
  html = html.replace(/__INLINE_TOKEN_(\d+)__/g, (_, index) => {
    const segment = protectedSegments[Number(index)] || "";
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return `<code>${escapeHtml(segment.slice(1, -1))}</code>`;
    }
    // 公式内容进入 HTML 文本节点前要转义，避免 a<b 被浏览器解析成标签。
    return escapeHtml(segment);
  });
  return html;
}

function isDisplayMathLine(line) {
  return /^\$\$[\s\S]*\$\$$/.test(line.trim());
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const usedHeadingIds = new Set();
  let paragraph = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines = [];
  const lists = [];
  let displayMath = null;
  let quoteLines = [];
  let tableRows = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${parseInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    const list = lists.pop();
    if (list) html.push(`</li></${list.type}>`);
  }

  function flushList() {
    while (lists.length) closeList();
  }

  function addListItem(indent, type, marker, content) {
    // 子列表必须在父 <li> 内打开；退回同级时先关闭子列表与上一个条目。
    while (lists.length && (lists.at(-1).indent > indent ||
           (lists.at(-1).indent === indent && lists.at(-1).type !== type))) closeList();
    const parent = lists.at(-1);
    if (parent?.indent === indent) {
      html.push("</li>");
    } else {
      const start = type === "ol" && marker !== 1 ? ` start="${marker}"` : "";
      html.push(`<${type}${start}>`);
      lists.push({ indent, type });
    }
    html.push(`<li>${parseInlineMarkdown(content)}`);
  }

  function renderDisplayMath(formula) {
    html.push(`<div class="math-block">${escapeHtml(formula)}</div>`);
  }

  function flushQuote() {
    if (!quoteLines.length) return;
    html.push(`<blockquote>${quoteLines.map((line) => `<p>${parseInlineMarkdown(line)}</p>`).join("")}</blockquote>`);
    quoteLines = [];
  }

  function flushCodeBlock() {
    if (!inCodeBlock) return;
    const code = codeLines.join("\n");
    if (codeLanguage === "mermaid") {
      html.push(`<pre class="mermaid">${escapeHtml(code)}</pre>`);
    } else {
      const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
      html.push(`<pre><code${languageClass}>${escapeHtml(code)}</code></pre>`);
    }
    inCodeBlock = false;
    codeLanguage = "";
    codeLines = [];
  }

  function flushTable() {
    if (!tableRows.length) return;
    // 仅按未转义的竖线分列，保留单元格内的字面竖线与行内公式。
    const splitCells = (row) => row.trim().replace(/^\||\|$/g, "")
      .split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
    const rows = tableRows.filter((row) => !/^\|?\s*(?:-+\s*\|\s*)+-+\s*\|?$/.test(row));
    html.push("<table><tbody>");
    rows.forEach((row, index) => {
      const tag = index === 0 ? "th" : "td";
      html.push(`<tr>${splitCells(row).map((cell) => `<${tag}>${parseInlineMarkdown(cell)}</${tag}>`).join("")}</tr>`);
    });
    html.push("</tbody></table>");
    tableRows = [];
  }

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    if (inCodeBlock) {
      if (line.startsWith("```")) {
        flushCodeBlock();
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    if (displayMath !== null) {
      displayMath.push(rawLine);
      if (line.trimEnd().endsWith("$$")) {
        renderDisplayMath(displayMath.join("\n"));
        displayMath = null;
      }
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      // 空行后的缩进条目或段落仍属上一项，不关闭父列表。
      let nextIndex = i + 1;
      while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
      const next = lines[nextIndex] || "";
      if (!lists.length || !/^\s+\S/.test(next)) flushList();
      flushQuote();
      flushTable();
      continue;
    }

    if (/^\|.*\|$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushQuote();
      tableRows.push(line);
      continue;
    }
    flushTable();

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      flushQuote();
      inCodeBlock = true;
      codeLanguage = line.slice(3).trim();
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const headingBase = headingText
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";
      let headingId = headingBase;
      let headingSuffix = 2;
      // 同名标题按出现顺序追加序号，避免目录锚点互相覆盖。
      while (usedHeadingIds.has(headingId)) headingId = `${headingBase}-${headingSuffix++}`;
      usedHeadingIds.add(headingId);
      html.push(`<h${level} id="${escapeHtml(headingId)}">${parseInlineMarkdown(headingText)}</h${level}>`);
      continue;
    }

    if (line === "---") {
      flushParagraph();
      flushList();
      flushQuote();
      html.push("<hr>");
      continue;
    }

    if (line.trimStart().startsWith("$$") &&
        (isDisplayMathLine(line) || lines.slice(i + 1).some((later) => later.trimEnd().endsWith("$$")))) {
      flushParagraph();
      flushList();
      flushQuote();
      // Notion 的 aligned 等公式跨行；保留 LaTeX 空白与独立公式的边界。
      if (isDisplayMathLine(line)) renderDisplayMath(line.trim());
      else displayMath = [rawLine.trimStart()];
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      html.push(
        `<figure><img loading="lazy" decoding="async" src="${escapeHtml(imageMatch[2])}" alt="${escapeHtml(imageMatch[1])}">${imageMatch[1] ? `<figcaption>${escapeHtml(imageMatch[1])}</figcaption>` : ""}</figure>`,
      );
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      continue;
    }

    const listMatch = rawLine.match(/^([ \t]*)(-|([1-9]\d*)\.)\s+(\S.*)$/);
    if (listMatch) {
      flushParagraph();
      flushQuote();
      const indent = listMatch[1].replace(/\t/g, "  ").length;
      addListItem(indent, listMatch[3] ? "ol" : "ul", Number(listMatch[3]), listMatch[4]);
      continue;
    }

    const indent = (rawLine.match(/^[ \t]*/)[0]).replace(/\t/g, "  ").length;
    if (lists.length && indent > lists.at(-1).indent) {
      html.push(`<p>${parseInlineMarkdown(line.trim())}</p>`);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushTable();
  flushCodeBlock();

  return html.join("\n");
}

function buildArticleHtml(meta, markdownBody) {
  const articleHtml = markdownToHtml(markdownBody);
  const hasCode = articleHtml.includes("<pre><code");
  const hasMermaid = articleHtml.includes('class="mermaid"');
  const hasMath = containsMath(markdownBody);
  const isNote = meta.kind === "notes";
  const title = escapeHtml(meta.title);
  const category = escapeHtml(meta.category || meta.kind);
  const date = escapeHtml(meta.date || "");
  const tags = (meta.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const mathStylesheet = hasMath
    ? '  <link rel="stylesheet" href="../css/vendor/katex-0.16.11/katex.min.css">'
    : "";
  const tocLabel = isNote ? "Chapters" : "On This Page";
  const chapterPagination = isNote
    ? `
      <nav class="chapter-pagination" data-chapter-pagination aria-label="章节导航" hidden>
        <a class="chapter-page chapter-page-prev" data-chapter-prev href="#" hidden><span>上一篇</span><strong></strong></a>
        <a class="chapter-page chapter-page-next" data-chapter-next href="#" hidden><span>下一篇</span><strong></strong></a>
      </nav>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(meta.title)}">
  <title>${title} — Yuyao Ma</title>
  <link rel="stylesheet" href="../css/style.css?v=2.0.4">
${mathStylesheet}
</head>
<body class="article-page${isNote ? " article-notes-page" : ""}">
  <header class="site-header">
    <a class="site-mark" href="../index.html" aria-label="Yuyao Ma home">YM</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">
      <span></span><span></span><span></span><span class="sr-only">Toggle navigation</span>
    </button>
    <nav class="site-nav" id="site-navigation" aria-label="Primary navigation">
      <a href="../work.html">Work</a>
      <a class="active" href="../notes-blogs.html" aria-current="page">Notes</a>
      <a href="../logs.html">Logs</a>
      <a href="../index.html">About</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main class="article-layout">
    <aside class="article-nav article-side-nav" aria-label="All notes">
      <h2>All Notes</h2>
      <ol data-note-list></ol>
    </aside>

    <article class="article-main">
      <div class="article-mobile-nav">
        <details><summary>All Notes</summary><ol class="article-nav" data-note-list></ol></details>
        <details><summary>${tocLabel}</summary><ol class="article-nav" data-toc-list></ol></details>
      </div>
      <a class="article-back" href="../notes-blogs.html">← Notes &amp; Blogs</a>
      <h1 class="article-title">${title}</h1>
      <div class="article-meta">
        <span>${escapeHtml(meta.kind)}</span><span>${date}</span><span>${category}</span>
        <span class="article-tags">${tags}</span>
      </div>
      <div class="article-content">${articleHtml}</div>${chapterPagination}
    </article>

    <aside class="article-nav article-side-nav" aria-label="${tocLabel}">
      <h2>${tocLabel}</h2>
      <ol data-toc-list></ol>
    </aside>
  </main>

  <footer class="site-footer" id="contact">
    <p>© 2026 YUYAO MA</p>
    <div class="footer-contact"><a class="text-link" href="mailto:yestyn_ma@163.com">yestyn_ma@163.com</a><span aria-hidden="true">·</span><span>Shanghai, China</span></div>
    <a class="text-link footer-social" href="https://github.com/YestinMa" target="_blank" rel="noreferrer">GitHub</a>
  </footer>

  <script src="../js/main.js?v=2.3.0"></script>
  <script src="../js/article.js?v=2.3.2"></script>
${
    hasCode
      ? `<script defer data-manual src="../js/vendor/prism-1.30.0/prism-core.min.js"></script>
  <script defer src="../js/vendor/prism-1.30.0/prism-python.min.js"></script>
  <script defer src="../js/article-code.js?v=1"></script>`
      : ""
  }
${
    hasMath
      ? `<script defer src="../js/vendor/katex-0.16.11/katex.min.js"></script>
  <script defer src="../js/vendor/katex-0.16.11/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof renderMathInElement !== "function") return;
      renderMathInElement(document.querySelector(".article-content"), {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\\\[", right: "\\\\]", display: true },
          { left: "\\\\(", right: "\\\\)", display: false },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    });
  </script>`
      : ""
  }
${
    hasMermaid
      ? `<script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({ startOnLoad: true, securityLevel: "loose", theme: "default" });
  </script>`
      : ""
  }
</body>
</html>
`;
}

async function indexExistingContent(rootDir) {
  const state = new Map();

  for (const kind of ["blog", "notes"]) {
    const dir = path.join(rootDir, kind);
    await fs.mkdir(dir, { recursive: true });

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const fullPath = path.join(dir, entry.name);
      const content = await fs.readFile(fullPath, "utf8");
      const notionPageIdMatch = content.match(/^notionPageId:\s*"([^"]+)"/m);
      const lastEditedTimeMatch = content.match(/^lastEditedTime:\s*"([^"]+)"/m);
      const renderVersionMatch = content.match(/^renderVersion:\s*"([^"]+)"/m);

      if (notionPageIdMatch) {
        state.set(notionPageIdMatch[1], {
          path: fullPath,
          status: parseFrontmatter(content)?.status || "",
          htmlPath: path.join(REPO_ROOT, kind, `${entry.name.replace(/\.md$/, "")}.html`),
          lastEditedTime: lastEditedTimeMatch ? lastEditedTimeMatch[1] : "",
          renderVersion: renderVersionMatch ? renderVersionMatch[1] : "",
        });
      }
    }
  }

  return state;
}

async function syncPage(token, page, ancestors, defaultStatus, isContainer, existingById, contentRoot, { strictImages = false } = {}) {
  if (isContainer) {
    return { status: "skipped", reason: "container", meta: { notionPageId: page.id } };
  }

  const meta = parsePageMeta(page, ancestors, defaultStatus);
  const existing = existingById.get(meta.notionPageId);

  if (!meta.kind) {
    return { status: "skipped", reason: "unknown-kind", meta };
  }

  if (!isPublishedStatus(meta.status)) {
    if (existing) {
      await fs.rm(existing.path, { force: true });
      if (existing.htmlPath) {
        await fs.rm(existing.htmlPath, { force: true });
      }
      await fs.rm(getAssetOutputDir(meta), { recursive: true, force: true });
      return { status: "removed", reason: "unpublished", meta };
    }
    return { status: "skipped", reason: "unpublished", meta };
  }

  const targetDir = path.join(contentRoot, meta.kind);
  const targetPath = path.join(targetDir, `${meta.slug}.md`);
  const htmlTargetPath = getHtmlOutputPath(meta);

  const htmlAlreadyExists = await fs
    .access(htmlTargetPath)
    .then(() => true)
    .catch(() => false);

  if (
    existing &&
    existing.lastEditedTime === meta.lastEditedTime &&
    existing.status === meta.status &&
    existing.path === targetPath &&
    htmlAlreadyExists &&
    existing.renderVersion === CONTENT_RENDER_VERSION
  ) {
    return { status: "skipped", reason: "unchanged", meta };
  }

  const blocks = await listBlockChildren(token, page.id);
  const assetDir = getAssetOutputDir(meta);
  await fs.rm(assetDir, { recursive: true, force: true });
  let imageIndex = 0;
  const markdownBody = await renderBlocks(token, blocks, {
    strictImages,
    assetDir,
    assetHrefBase: getAssetHrefBase(meta),
    nextImageIndex: () => {
      imageIndex += 1;
      return imageIndex;
    },
  });
  const fileContent = `${toFrontmatter(meta)}${markdownBody}`;
  const htmlContent = buildArticleHtml(meta, markdownBody);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(path.dirname(htmlTargetPath), { recursive: true });

  if (existing && existing.path !== targetPath) {
    await fs.rm(existing.path, { force: true });
  }
  if (existing && existing.htmlPath && existing.htmlPath !== htmlTargetPath) {
    await fs.rm(existing.htmlPath, { force: true });
  }

  await fs.writeFile(targetPath, fileContent, "utf8");
  await fs.writeFile(htmlTargetPath, htmlContent, "utf8");
  return { status: existing ? "updated" : "created", reason: "synced", meta, path: targetPath };
}

async function collectSourcePages(config) {
  if (config.syncMode === "database") {
    const entries = await queryDatabase(config.notionToken, config.databaseId);
    return entries.map((page) => ({ page, ancestors: [], defaultStatus: "", isContainer: false }));
  }

  return walkPageTree(config.notionToken, config.rootPageId, [], []);
}

function parseFrontmatter(content) {
  // Git 在 Windows 上可能以 CRLF 检出旧笔记，同步写入的文件则使用 LF。
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n(?:\r?\n)?/);
  if (!match) return null;

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    meta[key] = JSON.parse(rawValue);
  }

  return meta;
}

function toHref(fullPath) {
  return path.relative(REPO_ROOT, fullPath).split(path.sep).join("/");
}

async function collectContentEntries(contentRoot, kind) {
  const dir = path.join(contentRoot, kind);
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const fullPath = path.join(dir, entry.name);
    const content = await fs.readFile(fullPath, "utf8");
    const meta = parseFrontmatter(content);
    if (!meta || !isPublishedStatus(meta.status)) continue;

    items.push({
      title: meta.title || "Untitled",
      slug: meta.slug || entry.name.replace(/\.md$/, ""),
      date: meta.date || "",
      lastEditedTime: meta.lastEditedTime || "",
      category: meta.category || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      status: meta.status || "",
      notionPageId: meta.notionPageId || "",
      href: `${kind}/${meta.slug || entry.name.replace(/\.md$/, "")}.html`,
      kind,
    });
  }

  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return items;
}

async function writeContentIndex(contentRoot) {
  const blog = await collectContentEntries(contentRoot, "blog");
  const notes = await collectContentEntries(contentRoot, "notes");
  const payload = {
    generatedAt: new Date().toISOString(),
    blog,
    notes,
  };

  await fs.mkdir(contentRoot, { recursive: true });
  await fs.writeFile(path.join(contentRoot, "index.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function renderExistingContent(contentRoot) {
  let rendered = 0;

  for (const kind of ["blog", "notes"]) {
    const dir = path.join(contentRoot, kind);
    await fs.mkdir(dir, { recursive: true });
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const markdownPath = path.join(dir, entry.name);
      const rawContent = (await fs.readFile(markdownPath, "utf8")).replace(/\r\n/g, "\n");
      const frontmatterMatch = rawContent.match(/^---\n[\s\S]*?\n---\n\n?/);
      const meta = parseFrontmatter(rawContent);
      if (!frontmatterMatch || !meta) continue;

      const markdownBody = rawContent.slice(frontmatterMatch[0].length);
      const nextMeta = { ...meta, kind, slug: meta.slug || entry.name.replace(/\.md$/, "") };
      const nextContent = rawContent.replace(/^renderVersion:\s*"[^"]*"/m, `renderVersion: "${CONTENT_RENDER_VERSION}"`);
      const htmlPath = path.join(REPO_ROOT, kind, `${nextMeta.slug}.html`);

      // Draft 仅保留 Markdown 源文件，不进入公开页面或内容索引。
      if (!isPublishedStatus(nextMeta.status)) {
        await fs.rm(htmlPath, { force: true });
        continue;
      }

      await fs.mkdir(path.dirname(htmlPath), { recursive: true });
      await fs.writeFile(markdownPath, nextContent, "utf8");
      await fs.writeFile(htmlPath, buildArticleHtml(nextMeta, markdownBody), "utf8");
      rendered += 1;
    }
  }

  await writeContentIndex(contentRoot);
  console.log(`Rendered ${rendered} local article(s).`);
}

async function main() {
  await loadEnvFile(path.join(REPO_ROOT, ".env"));
  await loadEnvFile(path.join(FRONTEND_DIR, ".env"));
  if (process.argv.includes("--render-existing")) {
    const contentRoot = path.resolve(REPO_ROOT, process.env.SITE_CONTENT_DIR || "content");
    await renderExistingContent(contentRoot);
    return;
  }
  const config = getConfig();
  const contentRoot = config.contentRoot;
  const existingById = await indexExistingContent(contentRoot);
  const argumentIndex = process.argv.indexOf("--page-id");
  const targetId = argumentIndex === -1 ? "" : process.argv[argumentIndex + 1];
  if (argumentIndex !== -1 && (!targetId || !/^[0-9a-f-]{32,36}$/i.test(targetId) || targetId.replace(/-/g, "").length !== 32)) {
    throw new Error("--page-id requires a Notion page UUID");
  }
  const entries = await collectSourcePages(config);
  const sourcePages = targetId
    ? entries.filter(({page}) => page.id.replace(/-/g, "") === targetId.replace(/-/g, "").toLowerCase())
    : entries;
  if (targetId && sourcePages.length !== 1) throw new Error("Requested page is not in the configured Notion source");
  if (targetId) {
    const entry = sourcePages[0];
    const meta = parsePageMeta(entry.page, entry.ancestors, entry.defaultStatus);
    if (!isPublishedStatus(meta.status) || !meta.kind || entry.isContainer) {
      throw new Error("Requested page is not eligible for publication");
    }
  }
  const results = [];

  for (const item of sourcePages) {
    if (item.page.id === config.rootPageId) continue;
    results.push(
      await syncPage(
        config.notionToken,
        item.page,
        item.ancestors,
        item.defaultStatus,
        item.isContainer,
        existingById,
        contentRoot,
        { strictImages: Boolean(targetId) },
      ),
    );
  }

  const summary = results.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { created: 0, updated: 0, removed: 0, skipped: 0 },
  );

  await writeContentIndex(contentRoot);
  console.log(`Notion sync complete: ${JSON.stringify(summary)}`);
}

export { buildArticleHtml, getConfig, listBlockChildren, loadEnvFile, markdownToHtml, parsePageMeta, retrievePage, writeContentIndex };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
