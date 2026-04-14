## Context

The app is a FastAPI + React/Vite interstellar travel simulator. The backend serves star catalog data from a local SQLite database (`stars.db`, 15 MB, 119,629 rows from the HYG v3.8 catalog). The frontend makes 4 types of API calls: famous stars, nearby stars by distance/magnitude tier, a 50K-star map query, and FTS search.

The goal is to make this deployable on Vercel with GitHub-triggered CI/CD, using Supabase as the hosted database. All credentials must stay out of the repository.

## Goals / Non-Goals

**Goals:**
- Replace SQLite with Supabase Postgres, preserving the existing schema and queries
- Deploy FastAPI to Vercel as Python serverless functions
- Deploy the Vite frontend to Vercel as a static build
- Connect Vercel to the GitHub repo for automatic deploys on push to `main`
- Store secrets exclusively in Vercel environment variables
- Provide a one-time seed script that populates Supabase from the HYG CSV

**Non-Goals:**
- Changing the star data schema or adding new columns
- Replacing FastAPI with a different framework
- Moving search from server-side to client-side
- Row-level security or user auth (data is public read-only)

## Decisions

### 1. Postgres full-text search instead of SQLite FTS5

SQLite FTS5 does not exist in Postgres. Replace with `pg_trgm` trigram search using a GIN index on `proper_name` and `bayer_name`.

**Query change:**
```sql
-- was (SQLite FTS5):
SELECT … FROM stars_fts JOIN stars ON … WHERE stars_fts MATCH :query

-- becomes (Postgres):
SELECT … FROM stars
WHERE proper_name ILIKE :pattern OR bayer_name ILIKE :pattern
ORDER BY distance_ly
LIMIT 20
```

Where `:pattern` = `%<query>%`. This is slightly less sophisticated than BM25 ranking but adequate for star name lookup. A GIN index on `(lower(proper_name), lower(bayer_name))` makes it fast.

**Alternative considered:** Full `tsvector`/`to_tsquery` Postgres FTS. Rejected because star names are short proper nouns; trigram/ILIKE is simpler and performs identically at this scale.

### 2. psycopg2-binary for the DB driver

Use `psycopg2-binary` (synchronous) to keep the existing SQLAlchemy + FastAPI dependency pattern unchanged. The `DATABASE_URL` environment variable switches the connection from SQLite to Postgres.

**Alternative considered:** `asyncpg` with async SQLAlchemy. Rejected because it requires rewriting all route handlers to `async def` and the app has no concurrency bottleneck at this scale.

### 3. Vercel Python serverless runtime for FastAPI

Vercel supports Python via the `@vercel/python` runtime. A `vercel.json` file routes `/api/*` to `backend/main.py` and everything else to the frontend static build.

```json
{
  "builds": [
    { "src": "backend/main.py", "use": "@vercel/python" },
    { "src": "frontend/package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/main.py" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}
```

**Alternative considered:** Separate Vercel projects for frontend and backend. Rejected because a monorepo deployment keeps CORS simple (same origin) and simplifies the GitHub integration to one repo.

### 4. Supabase seeding via one-time script, not migrations

The HYG catalog is static reference data (not schema migrations). The `seed.py` script will be updated to connect to Supabase via `DATABASE_URL` and use `psycopg2` instead of `sqlite3`. Run once manually after provisioning.

`stars.db` and `data/hyg_v38.csv` are added to `.gitignore` — they do not need to be in the repository once Supabase is the source of truth.

**Alternative considered:** Supabase CLI migrations. Overkill for a static dataset; seeds are not repeatable schema changes.

### 5. Secrets via Vercel environment variables only

`DATABASE_URL` (Supabase Postgres connection string with pooler URL for serverless) is stored only in Vercel's environment variable settings, never in `.env` files committed to git.

A `.env.example` with placeholder values is committed to document what variables are needed.

The frontend uses `VITE_API_BASE_URL` (empty string in production, since same-origin) set as a Vercel env var. In local dev it points to `http://localhost:8000`.

## Risks / Trade-offs

**Vercel cold starts on serverless Python** → The first request after idle may take 2–4 seconds. Mitigation: acceptable for a portfolio/demo app; Vercel's free tier does not support always-on.

**Supabase free tier pauses after 1 week of inactivity** → Project pauses and needs manual restore. Mitigation: document this; add a health check ping if needed later.

**`psycopg2-binary` + Vercel Python bundling** → Binary wheel must be compatible with Vercel's Lambda runtime (Amazon Linux 2). `psycopg2-binary` ships pre-compiled wheels that are compatible. Mitigation: test with a minimal deploy before seeding.

**ILIKE search is case-insensitive but not fuzzy** → Users must type a prefix of the star name. FTS5 BM25 ranking is lost. Mitigation: acceptable for star name lookup; revisit if search UX degrades noticeably.

**Supabase connection limits on free tier** → 60 direct connections; serverless functions should use the pooler (Transaction mode, port 6543). Mitigation: use the pooler URL in `DATABASE_URL`.

## Migration Plan

1. Provision a Supabase project and copy the pooler `DATABASE_URL`
2. Add `DATABASE_URL` to Vercel environment variables (Production + Preview)
3. Update `backend/database.py` to use `DATABASE_URL` env var (Postgres URL)
4. Update `backend/seed.py` to use `psycopg2` instead of `sqlite3`
5. Run `seed.py` locally with `DATABASE_URL` pointing at Supabase to populate data
6. Update `backend/routers/stars.py` to replace FTS5 queries with ILIKE
7. Add `vercel.json` and update `backend/requirements.txt`
8. Update `frontend/vite.config.ts` to proxy `/api` in dev and use env var for prod
9. Connect Vercel project to GitHub repo; push to `main` triggers first deploy
10. Verify all endpoints via the deployed Vercel URL

**Rollback:** Local SQLite dev environment is unchanged; revert `DATABASE_URL` to SQLite path for local work. Vercel environment variable can be swapped without a code push.

## Open Questions

- Should the Supabase project be in the free tier ("Spark") or is a paid tier needed? (Free is sufficient for this read-only catalog at ~500MB limit; HYG data is ~15MB.)
- Should `stars.db` be deleted from the repo history, or just gitignored going forward? (gitignore is sufficient unless binary size in history becomes a problem.)
