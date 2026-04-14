## Why

The app currently runs on a local FastAPI + SQLite backend that cannot be deployed to any static or serverless host without modification. Migrating to Supabase (hosted Postgres) for the database and deploying via Vercel with GitHub integration enables a fully hosted, continuously deployed production environment at no cost.

## What Changes

- Replace the local SQLite database (`stars.db`) and SQLAlchemy setup with a Supabase Postgres database
- Migrate the star catalog data (119,629 rows from HYG v3.8) into Supabase
- Update the FastAPI backend to connect to Supabase via the Postgres connection string
- Deploy the FastAPI backend to Vercel as a Python serverless function
- Deploy the React/Vite frontend to Vercel as a static site
- Wire GitHub → Vercel integration so every push to `main` triggers an automatic deploy
- Store all secrets (Supabase connection string, etc.) as Vercel environment variables — **never committed to the repo**

## Capabilities

### New Capabilities

- `database-supabase`: Star catalog stored in Supabase Postgres; backend queries Postgres instead of SQLite; FTS search handled via Postgres `tsvector`/`pg_trgm` or ilike
- `vercel-deployment`: Full-stack deployment on Vercel — frontend as static build, backend as Python serverless functions; GitHub integration for continuous deployment
- `secret-management`: All credentials stored in Vercel environment variables; `.env` files gitignored; no secrets in source code or committed files

### Modified Capabilities

<!-- No existing spec-level requirements are changing -->

## Impact

- **Backend**: `database.py` updated to use Postgres (asyncpg or psycopg2); `seed.py` updated to seed Supabase; SQLite file removed from repo
- **Frontend**: No logic changes; API base URL configured via Vite env var to point at Vercel deployment
- **Dependencies**: Add `psycopg2-binary` (or `asyncpg`); remove SQLite-specific SQLAlchemy config
- **Repository**: Add `vercel.json` for routing config; add `.env.example`; ensure `.gitignore` covers `.env*`
- **CI/CD**: Vercel GitHub app handles build and deploy; no custom GitHub Actions needed
