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

更简单的方式是直接双击仓库根目录的：

```text
sync-notion-and-publish.bat
```

BAT 会自动检查环境与 Git 分支、同步 Notion、重新生成文章、提交同步产物并推送到 `origin/main`。用于 Windows 任务计划程序时可添加 `--no-pause` 参数，结束后不会等待按键。

可先运行安全预检（不会同步、修改、提交或推送）：

```text
sync-notion-and-publish.bat --validate-only --no-pause
```

如需在不修改文件、不提交、不推送的情况下检查环境，可运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-website.ps1 -ValidateOnly
```

发布失败时，错误摘要会写入 `scripts/last-publish-error.log`。

脚本只暂存 `content/`、`notes/` 和 `blog/` 同步产物，不会把其他工作区改动一并提交。

## 本地预览

站点需要通过 HTTP 打开，以便文章列表读取 `content/index.json`：

```powershell
python -m http.server 8000
```

访问 `http://127.0.0.1:8000/`。

## 网站版本与 Logs

顶层导航的 Logs 展示从 `feat: 增加了日志功能` 起推送到 `main` 的所有新提交，按新到旧排列，格式为 `提交说明 (版本号)`。一次推送包含多个提交时逐条展示；提交说明取首行。

网站版本保存在根目录 `VERSION`，当前为 `1.1`，独立于 `frontend/package.json`。笔记同步不修改版本；发布功能更新时手动修改 `VERSION`，并与功能一起提交。旧日志使用对应提交时的版本。

GitHub Actions 的 `Deploy website and logs` 获取完整 Git 历史、生成日志并部署 Pages。生成结果只进入部署产物，不回写仓库；`content/logs.json` 保留首条记录供本地预览。首次接入时将仓库 **Settings → Pages → Build and deployment → Source** 设为 **GitHub Actions**，停止原有分支部署。

提交功能后，可运行 `node scripts/generate-logs.mjs dist/content/logs.json` 检查实际日志；运行 `node --test scripts/generate-logs.test.mjs` 验证版本与排序。只有成功提交到 Git 历史的更新才会进入生成结果，工作区改动不会被误记为推送。

## 编码

所有文本文件均使用 UTF-8。终端中文显示异常时，应先切换终端编码，不要转换项目文件编码。
