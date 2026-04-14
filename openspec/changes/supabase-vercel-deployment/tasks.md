## 1. Repository Hygiene & Secret Management

- [ ] 1.1 Add `.env`, `.env.local`, `stars.db`, and `data/hyg_v38.csv` to `.gitignore`
- [ ] 1.2 Create `.env.example` at the repo root with placeholder values for `DATABASE_URL`, `FRONTEND_ORIGIN`, and `VITE_API_BASE_URL` with inline comments
- [ ] 1.3 Add `python-dotenv` to `backend/requirements.txt` and load `.env` in `backend/main.py` startup using `load_dotenv()`

## 2. Backend: Database Layer

- [ ] 2.1 Update `backend/database.py` to read `DATABASE_URL` from the environment (via `os.environ`) and build the SQLAlchemy engine from it; remove all hardcoded SQLite paths
- [ ] 2.2 Add `psycopg2-binary` to `backend/requirements.txt`
- [ ] 2.3 Update `backend/main.py` CORS `allow_origins` to also include the value of the `FRONTEND_ORIGIN` environment variable (fall back gracefully if not set)
- [ ] 2.4 Remove the `startup` event handler that auto-seeds SQLite on startup (seeding is now a manual one-time step)

## 3. Backend: Search Query Update

- [ ] 3.1 In `backend/routers/stars.py`, replace the FTS5 `stars_fts MATCH` search query with a Postgres `ILIKE '%<query>%'` query against `proper_name` and `bayer_name`, ordered by `distance_ly`, limited to 20

## 4. Seed Script: Migrate to Postgres

- [ ] 4.1 Rewrite `backend/seed.py` to use `psycopg2` (reading `DATABASE_URL` from env via `python-dotenv`) instead of `sqlite3`
- [ ] 4.2 Update schema creation in `seed.py` to use Postgres DDL: replace `INTEGER PRIMARY KEY AUTOINCREMENT` with `SERIAL PRIMARY KEY`, and `REAL` with `DOUBLE PRECISION`
- [ ] 4.3 Add a `CREATE INDEX` for `distance_ly` and `is_famous`, plus a GIN index for trigram search: `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE INDEX … USING GIN (lower(proper_name) gin_trgm_ops, lower(bayer_name) gin_trgm_ops)`
- [ ] 4.4 Remove all SQLite FTS5 virtual table creation from `seed.py`
- [ ] 4.5 Run `seed.py` locally with `DATABASE_URL` pointing at the Supabase project to populate the star catalog; verify row count (~119,629+ rows, 18 famous stars)

## 5. Vercel Configuration

- [ ] 5.1 Create `vercel.json` at the repo root with builds for `backend/main.py` (Python runtime) and `frontend/package.json` (static build with `distDir: dist`), and routes for `/api/(.*)` → backend and `/(.*)` → frontend
- [ ] 5.2 Update `frontend/vite.config.ts` to use `VITE_API_BASE_URL` env var as the API base URL prefix in fetch calls (empty string in prod, `http://localhost:8000` in dev)
- [ ] 5.3 Update all `fetch('/api/...')` calls in the frontend to use the configured base URL (search for `fetch('/api` and `fetch(\`/api`)
- [ ] 5.4 Add a `frontend/.env.development` (gitignored) and document in `.env.example` that `VITE_API_BASE_URL=http://localhost:8000` for local dev

## 6. Vercel Project Setup (Manual Steps)

- [ ] 6.1 Create a Vercel project connected to the GitHub repository via the Vercel dashboard; set the root directory to `.` (repo root)
- [ ] 6.2 Add `DATABASE_URL` (Supabase pooler URL, port 6543) as a Vercel environment variable scoped to Production and Preview
- [ ] 6.3 Add `FRONTEND_ORIGIN` (the Vercel deployment URL, e.g. `https://science-v-cinema.vercel.app`) as a Vercel environment variable
- [ ] 6.4 Trigger the first deploy and verify `/api/stars/famous` and the frontend both load correctly from the Vercel URL

## 7. Verification

- [ ] 7.1 Confirm no `.env` files or `stars.db` appear in `git status` or `git log` after all changes
- [ ] 7.2 Test all four API tiers (famous, naked-eye, binocular, all-nearby) from the deployed Vercel URL
- [ ] 7.3 Test star search from the deployed frontend
- [ ] 7.4 Open a test PR and confirm Vercel creates a preview deployment automatically
