## ADDED Requirements

### Requirement: Backend connects to Supabase Postgres via environment variable
The backend SHALL read the database connection URL exclusively from the `DATABASE_URL` environment variable. It SHALL NOT hardcode a SQLite path or any Postgres credentials. If `DATABASE_URL` is not set, the application SHALL fail to start with a clear error message.

#### Scenario: Application starts with DATABASE_URL set
- **WHEN** the application starts and `DATABASE_URL` is a valid Postgres connection string
- **THEN** the backend connects to Supabase Postgres and serves all API endpoints successfully

#### Scenario: Application fails to start without DATABASE_URL
- **WHEN** the application starts and `DATABASE_URL` is not set
- **THEN** the application raises a configuration error and does not start

### Requirement: Star catalog schema matches existing SQLite schema in Postgres
The Supabase database SHALL contain a `stars` table with the same columns as the existing SQLite schema: `id`, `hyg_id`, `hip`, `proper_name`, `bayer_name`, `x`, `y`, `z`, `distance_pc`, `distance_ly`, `spectral_type`, `magnitude`, `abs_magnitude`, `is_famous`, `famous_rank`, `blurb`. Indexes SHALL exist on `distance_ly` and `is_famous`.

#### Scenario: All existing API endpoints return correct data
- **WHEN** any of `/api/stars/famous`, `/api/stars/nearby`, `/api/stars/search`, or `/api/stars/{id}` is called
- **THEN** the response matches the same shape and data as the SQLite-backed version

### Requirement: Search uses ILIKE trigram matching instead of FTS5
The `/api/stars/search` endpoint SHALL use a Postgres `ILIKE '%<query>%'` query against `proper_name` and `bayer_name`. A GIN index on the lowercased name columns SHALL exist to keep search performant. Results SHALL be ordered by `distance_ly` and limited to 20.

#### Scenario: Search returns matching stars
- **WHEN** a GET request is made to `/api/stars/search?q=siri`
- **THEN** the response includes Sirius and any other stars whose name contains "siri" (case-insensitive), ordered by distance

#### Scenario: Empty search returns empty list
- **WHEN** a GET request is made to `/api/stars/search?q=`
- **THEN** the response is an empty array

### Requirement: Seed script populates Supabase from HYG CSV
A seed script SHALL exist that reads `DATABASE_URL` from the environment, downloads and parses the HYG v3.8 CSV, and inserts all stars (including famous star metadata and manual stars) into the Supabase `stars` table. The script SHALL be idempotent: if data already exists, it SHALL drop and recreate the table before seeding.

#### Scenario: Seed populates all expected rows
- **WHEN** the seed script is run against an empty Supabase database
- **THEN** the `stars` table contains 119,629+ rows, 18 famous stars, and all manual stars (TRAPPIST-1, Kepler-452, Sagittarius A*)

#### Scenario: Seed is idempotent on re-run
- **WHEN** the seed script is run a second time
- **THEN** it drops and recreates the table without error, and the final row count is correct

### Requirement: Supabase pooler URL used for serverless connections
The `DATABASE_URL` in production SHALL point to the Supabase connection pooler (Transaction mode, port 6543) to stay within the free tier's connection limit of 60.

#### Scenario: Multiple concurrent serverless function invocations
- **WHEN** multiple Vercel serverless function instances connect simultaneously
- **THEN** connections are pooled through Supabase's pooler and no "too many connections" error is raised
