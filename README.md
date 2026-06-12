# Personal Website

This repository contains a static personal website, a strategy dashboard prototype, and a lightweight Notion content sync script.

## Project Structure

- `backend/`: FastAPI service with reserved strategy endpoints.
- `frontend/`: Vue 3 + Vite dashboard app and the Notion sync script runtime.
- `frontend/scripts/sync-notion.js`: syncs Notion content into local Markdown files.
- `content/`: generated Markdown content after a sync run.
- `strategy-dashboard.html`: static entry page pointing to the dashboard app.

## Notion CMS Sync

### What it does

The sync script pulls content from Notion and writes Markdown files into:

- `content/blog/`
- `content/notes/`

Each generated file includes frontmatter:

- `title`
- `slug`
- `date`
- `lastEditedTime`
- `category`
- `tags`
- `status`
- `notionPageId`

Only pages with `status` equal to `Published`, `Public`, or `Ready` are synced.

### Create a Notion integration

1. Open [Notion Integrations](https://www.notion.so/my-integrations).
2. Create a new internal integration.
3. Copy the integration token and store it as `NOTION_TOKEN`.

### Grant access to your content

1. Open the target Notion page or database.
2. Click `Share`.
3. Invite the integration you created.
4. Copy either the database ID or the root page ID.

### Environment variables

Create a root `.env` file from `.env.example` and fill in the values:

```bash
NOTION_TOKEN=
NOTION_ROOT_PAGE_ID=
NOTION_DATABASE_ID=
NOTION_SYNC_MODE=database
SITE_CONTENT_DIR=content
```

Variables:

- `NOTION_TOKEN`: required.
- `NOTION_SYNC_MODE`: `database` or `page`.
- `NOTION_DATABASE_ID`: required when `NOTION_SYNC_MODE=database`.
- `NOTION_ROOT_PAGE_ID`: required when `NOTION_SYNC_MODE=page`.
- `SITE_CONTENT_DIR`: output directory relative to the repo root.

### Content model expectations

Recommended Notion properties:

- `Title` or `Name`
- `Status`
- `Slug`
- `Date`
- `Category`
- `Tags`
- `Type`

`Type` or `Category` should indicate whether the page belongs to `blog` or `notes`.

### Run sync manually

```bash
cd frontend
npm install
npm run sync
```

The script supports:

- direct database sync via `NOTION_DATABASE_ID`
- root-page traversal via `NOTION_ROOT_PAGE_ID`
- incremental updates using `last_edited_time`
- Markdown conversion for headings, paragraphs, lists, quotes, code, images, bookmarks, and dividers

Unsupported block types are preserved as HTML comments in the generated Markdown.

In `page` mode, plain leaf pages without database properties are treated as published by default so that a `Blog` / `Notes` page tree can still sync. Container pages are skipped.

### Deploy with automatic sync

If your deployment platform can run shell commands before build, use:

```bash
cd frontend
npm install
npm run sync
npm run build
```

If your site host deploys from the repo root, make sure it runs the same sequence before publishing static assets.

## Run Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Reserved API Endpoints

- `GET /health`
- `GET /api/v1/strategies/{strategy_id}/dashboard`
- `GET /api/v1/strategies/{strategy_id}/signals`

`/dashboard` currently returns mock data and is ready to be replaced with real strategy/backtest/live data.
