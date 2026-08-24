# Content Blocks deployment

Content Blocks ships as a **Vite static frontend** plus **Vercel Serverless Functions** under `/api`, with **Turso/libSQL** storage via **Drizzle**.

Shared pages use **stable 10-character URLs** (`/p/5Q25jl1374`) with anonymous live editing—anyone with the link can view and edit, and changes autosave to the same record.

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
- [Turso CLI](https://docs.turso.tech/cli) (optional, for creating databases)
- Node.js 20+

## 1. Create the Turso database

```bash
turso db create content-blocks
turso db show content-blocks --url
turso db tokens create content-blocks
```

Save the database URL and auth token.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local work:

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Purpose |
|---|---|
| `TURSO_DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `SHARE_ADMIN_SECRET` | Bearer secret for `DELETE /api/shares/:id` |
| `SHARE_IP_HASH_SALT` | Random string used to hash client IPs for rate limiting |

Add the same variables in the **Vercel project settings** for production.

Optional:

- `ALLOWED_ORIGINS` — comma-separated browser origins allowed to call `POST /api/shares` and `PUT /api/shares/:id`
- `SHARE_RATE_LIMIT_MAX` — hourly **share creation** limit per IP (default `20`)
- `SHARE_PUT_RATE_LIMIT_MAX` — per-minute **save** limit per page/IP (default `120`)

## 3. Apply database migrations

Production and staging should use committed SQL migrations:

```bash
npm install
npm run db:migrate
```

This runs `drizzle-kit migrate` against the database configured in your environment.

**Important:** After `npm run db:generate`, review the generated SQL before applying. Migration `0001` renames `page_snapshots` → `shared_pages` and preserves existing rows/IDs. If Drizzle generates an unsafe drop/create migration instead, replace the SQL with the reviewed rename migration before running `db:migrate`.

Optional local convenience (schema drift only, not for production):

```bash
npm run db:push
```

When the schema changes:

```bash
npm run db:generate
# review drizzle/*.sql, then commit drizzle/*.sql and drizzle/meta/*
npm run db:migrate
```

## 4. Local development

### Full stack (recommended when working on sharing)

```bash
vercel dev
```

This serves the Vite app, `/api/*` functions, and `/p/:id` SPA routing together. API functions load `.env.local` via `api/_lib/env.ts`.

### Frontend only

```bash
npm run dev
```

Vite proxies `/api` to `http://localhost:3000`. Run `vercel dev` in another terminal when you need the API locally.

## 5. Run tests

```bash
npm test
```

Route-level write tests cover optimistic concurrency (success, stale version 409, revoked, expired).

## 6. Deploy to Vercel

```bash
vercel link
vercel env pull .env.local
npm run db:migrate
vercel deploy --prod
```

Or connect the GitHub repository in the Vercel dashboard and deploy on push.

Ensure migrations have been applied to the production Turso database before or immediately after the first deploy that includes live shared pages.

## 7. Verify production

1. Open the deployed app and create a page.
2. Click **Share** — clipboard should contain `https://your-domain/p/XXXXXXXXXX` (10 characters).
3. Open that URL in a private window — page loads with the live collaboration banner.
4. Edit in both windows — changes autosave; reload shows the latest saved version.
5. Click **Share** while on `/p/:id` — same URL is copied (no new ID).
6. Create a share with the API unavailable — hash fallback toast appears and a `#cb1...` link is copied.

## 8. Admin revoke (no UI in v1)

```bash
curl -X DELETE "https://your-domain/api/shares/XXXXXXXXXX" \
  -H "Authorization: Bearer $SHARE_ADMIN_SECRET"
```

## Notes

- `#cb1...` hash links remain fully client-side and work without the API.
- POST share creation is rate-limited via `share_rate_limits` (default 20/hour/IP).
- PUT autosave is rate-limited separately via `share_put_rate_limits` (default 120/min/page/IP).
- Concurrent edits use last-write-wins with version conflict detection (409 → reload prompt).
- Shared pages do not auto-expire in v1 (`expires_at` is `NULL`).
