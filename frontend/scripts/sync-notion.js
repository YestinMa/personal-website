import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FRONTEND_DIR, "..");

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
  const body = init.body || "";
  const method = init.method || "GET";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await new Promise((resolve, reject) => {
        const request = https.request(
          url,
          {
            method,
            headers,
            timeout: 30000,
          },
          (result) => {
            const chunks = [];
            result.on("data", (chunk) => chunks.push(chunk));
            result.on("end", () => {
              const rawBody = Buffer.concat(chunks).toString("utf8");
              resolve({
                statusCode: result.statusCode || 0,
                statusMessage: result.statusMessage || "",
                body: rawBody,
              });
            });
          },
        );

        request.on("timeout", () => {
          request.destroy(new Error("Request timed out"));
        });
        request.on("error", reject);

        if (body) {
          request.write(body);
        }
        request.end();
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Notion API request failed: ${response.statusCode} ${response.statusMessage}\n${response.body}`);
      }

      return JSON.parse(response.body);
    } catch (error) {
      const isRetryable =
        attempt < 3 &&
        (error.code === "ECONNRESET" || error.code === "ETIMEDOUT" || error.message === "Request timed out");

      if (!isRetryable) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
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
  return text.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

function richTextToMarkdown(richText = []) {
  return richText
    .map((item) => {
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

async function renderBlocks(token, blocks, depth = 0) {
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
      case "paragraph":
        lines.push(`${indent}${getBlockText(block, "paragraph")}`, "");
        break;
      case "bulleted_list_item":
        lines.push(`${indent}- ${getBlockText(block, "bulleted_list_item")}`);
        if (children.length) {
          const nested = await renderBlocks(token, children, depth + 1);
          lines.push(nested.trimEnd());
        }
        break;
      case "numbered_list_item":
        lines.push(`${indent}1. ${getBlockText(block, "numbered_list_item")}`);
        if (children.length) {
          const nested = await renderBlocks(token, children, depth + 1);
          lines.push(nested.trimEnd());
        }
        break;
      case "quote":
        lines.push(`${indent}> ${getBlockText(block, "quote")}`, "");
        break;
      case "code": {
        const language = block.code.language || "";
        const content = richTextToMarkdown(block.code.rich_text);
        lines.push(`\`\`\`${language}`, content, "```", "");
        break;
      }
      case "image": {
        const url = getImageSource(block.image);
        const caption = richTextToMarkdown(block.image.caption || []) || "Notion image";
        lines.push(`![${caption}](${url})`, "");
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
          const nested = await renderBlocks(token, children, depth);
          lines.push(nested.trimEnd(), "");
        }
        break;
    }
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function toFrontmatter(meta) {
  const payload = {
    title: meta.title,
    slug: meta.slug,
    date: meta.date,
    lastEditedTime: meta.lastEditedTime,
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

      if (notionPageIdMatch) {
        state.set(notionPageIdMatch[1], {
          path: fullPath,
          lastEditedTime: lastEditedTimeMatch ? lastEditedTimeMatch[1] : "",
        });
      }
    }
  }

  return state;
}

async function syncPage(token, page, ancestors, defaultStatus, isContainer, existingById, contentRoot) {
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
      return { status: "removed", reason: "unpublished", meta };
    }
    return { status: "skipped", reason: "unpublished", meta };
  }

  const targetDir = path.join(contentRoot, meta.kind);
  const targetPath = path.join(targetDir, `${meta.slug}.md`);

  if (existing && existing.lastEditedTime === meta.lastEditedTime && existing.path === targetPath) {
    return { status: "skipped", reason: "unchanged", meta };
  }

  const blocks = await listBlockChildren(token, page.id);
  const markdownBody = await renderBlocks(token, blocks);
  const fileContent = `${toFrontmatter(meta)}${markdownBody}`;

  await fs.mkdir(targetDir, { recursive: true });

  if (existing && existing.path !== targetPath) {
    await fs.rm(existing.path, { force: true });
  }

  await fs.writeFile(targetPath, fileContent, "utf8");
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
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?/);
  if (!match) return null;

  const meta = {};
  for (const line of match[1].split("\n")) {
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
    if (!meta) continue;

    items.push({
      title: meta.title || "Untitled",
      slug: meta.slug || entry.name.replace(/\.md$/, ""),
      date: meta.date || "",
      lastEditedTime: meta.lastEditedTime || "",
      category: meta.category || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      status: meta.status || "",
      notionPageId: meta.notionPageId || "",
      href: toHref(fullPath),
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

async function main() {
  await loadEnvFile(path.join(REPO_ROOT, ".env"));
  await loadEnvFile(path.join(FRONTEND_DIR, ".env"));
  const config = getConfig();
  const contentRoot = config.contentRoot;
  const existingById = await indexExistingContent(contentRoot);
  const sourcePages = await collectSourcePages(config);
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

await main();
