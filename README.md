# Yuyao Ma — Personal Website

以排版与留白为核心的静态个人网站，包含 About、Work、Factor Dashboard、Notes 与 Notion 内容同步工具。

## 页面结构

- `index.html`：个人主页
- `work.html`：研究项目索引
- `factor-dashboard/`：因子研究与回测看板
- `notes-blogs.html`：笔记与文章索引
- `notes/`、`blog/`：同步后生成的静态文章
- `content/`：Markdown 源内容、索引与本地化图片

## Notion 内容同步

同步脚本位于 `frontend/scripts/sync-notion.js`，仅同步状态为 `Published`、`Public` 或 `Ready` 的页面。生成的文章支持标题目录、公式、Mermaid、代码块和本地化图片。

在仓库根目录配置 `.env`：

```dotenv
NOTION_TOKEN=
NOTION_ROOT_PAGE_ID=
NOTION_DATABASE_ID=
NOTION_SYNC_MODE=database
SITE_CONTENT_DIR=content
```

安装并同步：

```powershell
cd frontend
npm install
npm run sync
```

仅根据现有 Markdown 重新生成文章 HTML，无需访问 Notion：

```powershell
cd frontend
npm run render
```

也可以从仓库根目录执行同步、提交和发布脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-website.ps1
```

脚本只暂存 `content/`、`notes/` 和 `blog/` 同步产物，不会把其他工作区改动一并提交。

## 本地预览

站点需要通过 HTTP 打开，以便文章列表读取 `content/index.json`：

```powershell
python -m http.server 8000
```

访问 `http://127.0.0.1:8000/`。

## 编码

所有文本文件均使用 UTF-8。终端中文显示异常时，应先切换终端编码，不要转换项目文件编码。
