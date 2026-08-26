# Content Blocks — project handoff

Content Blocks is a web app for mapping a webpage’s content hierarchy before design or development. Users stack **Focus Points**, **Content Blocks**, **Calls to Action**, **the Fold**, and **the Footer** on a canvas, then share a live link with a client.

It is used by Creative Isles internally and by clients who receive a URL. Anyone with a live link can view and edit that page; edits autosave to the same record.

---

## What it is for

Typical workflow:

1. Open the app (or **New Page**).
2. Add and arrange blocks to describe a page (home, landing, property, etc.).
3. Fill in page / client / version / prepared-by / contact metadata.
4. Copy the URL (or click **Share**) and send it to a client.
5. Client and studio keep editing the same link; the URL does not change.
6. Optionally **Export** a PNG of the canvas.

The product is a planning tool, not a CMS or a published website builder.

---

## Tech stack

| Layer | Choice |
|---|---|
| Language | **TypeScript** (strict, ES2022) |
| UI | **React 18** |
| Bundler / dev server | **Vite 6** |
| Styling | **Tailwind CSS 3** + PostCSS |
| Drag and drop | **@dnd-kit** (core + sortable) |
| IDs | **uuid** |
| PNG export | **html-to-image** |
| API | **Vercel Serverless Functions** (`@vercel/node`) under `/api` |
| Database | **Turso / libSQL** |
| ORM / migrations | **Drizzle ORM** + **drizzle-kit** |
| Hosting | **Vercel** (static `dist/` + `/api` functions) |
| Tests | **Vitest** |

There is **no Next.js**. The frontend is a Vite SPA. The API is separate Vercel functions that import shared TypeScript from `shared/` via **relative paths** (no `@shared/*` aliases — Vercel functions compile more reliably that way).

Node **20+** is expected.

---

## Repository layout

```
content-blocks/
├── src/                    # React SPA
│   ├── App.tsx             # Shell: sidebar, canvas, dnd, share/export
│   ├── hooks/useContentBlocks.ts   # All page state, save, share, new page
│   ├── components/         # Canvas, blocks, sidebar, save pill, toasts
│   └── lib/                # Persistence, share client, dnd, export, rich text
├── shared/                 # Types + validation used by both SPA and API
│   ├── types.ts
│   ├── limits.ts
│   ├── validateState.ts    # Strict server validation; lenient sanitize for load
│   └── sanitizeLabel.ts    # HTML subset for labels (no DOM APIs)
├── api/                    # Vercel functions
│   ├── shares/index.ts     # POST /api/shares — create page
│   ├── shares/[id].ts      # GET / PUT / DELETE /api/shares/:id
│   └── _lib/               # db, schema, rate limits, write helpers
├── drizzle/                # Committed SQL migrations
├── vercel.json             # Vite build + /p/:id rewrite to index.html
├── DEPLOYMENT.md           # Env vars, Turso, migrate, deploy
└── .env.example            # Required secrets (copy to .env.local)
```

Entry: `index.html` → `src/main.tsx` → `App.tsx`.

---

## Domain model

A page is an `AppState`:

- **meta** — `page`, `client`, `version`, `preparedBy`, `contact`
- **items** — ordered canvas list:
  - `focus` / `content` — labeled blocks; up to **2 CTAs** each
  - `fold` / `footer` — markers; **at most one of each** on the canvas

Labels allow a small HTML subset (`b`, `i`, `br`, etc.). Two hyphens typed in a label become an em dash.

Limits (see `shared/limits.ts`): 200 items, 512 KB payload, 10-character share IDs `[0-9A-Za-z]`.

---

## How it functions

### Canvas and tools

The left sidebar adds tools (click or drag onto the canvas). The main canvas is a vertical stack with drop gaps. Selecting a block and hitting Delete/Backspace removes it. **Export** rasterizes the canvas to a PNG.

### Stable live URLs (`/p/:id`)

This is the primary persistence model.

As soon as a page has at least one canvas item, the app **POSTs `/api/shares`** and replaces the address bar with a stable path:

`https://<host>/p/XXXXXXXXXX` (10 characters)

That ID does not change again for that page. Further edits **PUT** the same record (debounced ~800ms). Closing the tab flushes a save (`pagehide` / `visibilitychange`, `fetch` keepalive when the body is small enough).

**Share** copies the current `/p/:id` URL (after flushing). It does not mint a new ID.

**New Page** opens `/?new=1` in a new tab (root app, never the current `/p/:id`). A blank page gets a **new** ID only after the user adds content.

Opening `/` resumes the last live page stored in `localStorage` (unless the tab was opened via **New Page**).

Vercel rewrites `/p/:id` → `index.html` so the SPA can read the id from `window.location.pathname`.

### Autosave guards

Empty canvases cannot be created or saved to the server (`items.length === 0` is rejected). Autosave is blocked until the shared page has finished loading from the server, so a blank initial React state cannot overwrite a saved page. Concurrent editors use a `version` field; a stale PUT returns **409** and the UI asks to reload.

### Hash fallback (`#cb1.…`)

If the share API is unavailable, **Share** copies a client-only URL: gzip + base64url of the page state in the hash (`cb1.` prefix). Old hash links still load. The app **no longer rewrites the hash on every keystroke** (that used to make bookmarked URLs huge, truncated, or empty). A hash that cannot be decoded shows an error instead of a blank canvas.

### localStorage

Key `content-blocks:v2` stores `{ state, liveShareId }` as a backup and so `/` can resume the last live page. Server state is source of truth for `/p/:id`.

---

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/shares` | Create a live page; body `{ state }`; returns `{ id, url, version, updatedAt }` |
| `GET` | `/api/shares/:id` | Load page JSON |
| `PUT` | `/api/shares/:id` | Autosave; body `{ state, version }` |
| `DELETE` | `/api/shares/:id` | Revoke (admin); `Authorization: Bearer $SHARE_ADMIN_SECRET` |

Writes require a matching browser **Origin** (or same-host Referer). Optional `ALLOWED_ORIGINS` allowlist.

Rate limits (hashed client IP):

- Create: 20 / hour / IP (`share_rate_limits`)
- Save: 120 / minute / page / IP (`share_put_rate_limits`)

### Database (Turso)

Table `shared_pages`: `id`, `state_json`, `state_bytes`, `created_at`, `updated_at`, `version`, `expires_at` (unused in v1), `revoked_at`, `creator_ip_hash`.

Schema lives in `api/_lib/schema.ts`. Apply committed SQL with `npm run db:migrate`. Do not use `db:push` in production.

---

## Local development

Full stack (SPA + API + `/p/:id` routing):

```bash
cp .env.example .env.local   # fill Turso + secrets
npm install
npm run db:migrate
npm run dev:vercel           # vercel dev
```

Frontend only (`npm run dev`) serves Vite on port 5173 and proxies `/api` to `localhost:3000`. You need `vercel dev` (or another process) on 3000 for sharing/autosave to work. If port 3000 is already used by another app, use `vercel dev` as the primary server instead.

```bash
npm test                     # vitest
npm run build                # tsc --noEmit && vite build
```

Deploy, env vars, and production checks: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## Tests worth knowing

| File | Covers |
|---|---|
| `src/lib/liveShareUrl.test.ts` | When a page should get a `/p/:id` |
| `src/lib/persistence.test.ts` | New Page URLs; local snapshot + share id |
| `src/lib/liveShareHydration.test.ts` | No PUT while loading / empty canvas |
| `src/lib/sharedPageSaveUi.test.ts` | Saving / saved / error / conflict pill |
| `shared/validateState.test.ts` | Empty page cannot be written |
| `api/_lib/sharedPageWrite.test.ts` | Version increment, 409, revoke, expiry |

---

## Product rules (for the next owner)

- A saved URL must stay the same for the life of that page.
- **New Page** must never clone the current live `/p/:id`.
- Do not PUT an empty canvas onto an existing share.
- Keep `shared/` isomorphic (no `document` / `window`) so API functions can import it.
- After `npm run db:generate`, **read the SQL** before migrating; an unsafe drop/create would destroy live pages.

GitHub: the app deploys from `main` on Vercel when the project is connected.
