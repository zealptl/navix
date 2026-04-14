## ADDED Requirements

### Requirement: No secrets committed to the repository
The repository SHALL NOT contain any credentials, connection strings, API keys, or tokens in any committed file. This includes `.env` files, configuration files, source code, and documentation. The `.gitignore` SHALL exclude all `.env*` files (except `.env.example`).

#### Scenario: .env files are gitignored
- **WHEN** a `.env` file is created locally
- **THEN** `git status` does not show it as a tracked or untracked file to be committed

#### Scenario: Source code contains no hardcoded credentials
- **WHEN** the repository is searched for connection strings, passwords, or API keys
- **THEN** no matches are found in any committed file

### Requirement: .env.example documents required variables without values
A `.env.example` file SHALL be committed to the repository root documenting all required environment variables with placeholder values and brief comments. It SHALL NOT contain real credentials.

#### Scenario: Developer onboarding from .env.example
- **WHEN** a new developer clones the repo
- **THEN** they can copy `.env.example` to `.env`, fill in their own values, and run the app locally

### Requirement: Production secrets stored exclusively in Vercel environment variables
All production credentials (`DATABASE_URL`, `FRONTEND_ORIGIN`, and any future secrets) SHALL be configured through the Vercel dashboard or Vercel CLI as environment variables scoped to Production and Preview environments. They SHALL NOT be passed via any other mechanism.

#### Scenario: DATABASE_URL available to serverless function at runtime
- **WHEN** the Vercel serverless function starts
- **THEN** `os.environ["DATABASE_URL"]` returns the Supabase connection string configured in Vercel

#### Scenario: Secrets not visible in build logs
- **WHEN** Vercel builds and deploys the application
- **THEN** the `DATABASE_URL` value does not appear in plain text in build output or logs

### Requirement: Local development uses a local .env file
For local development, `DATABASE_URL` SHALL be read from a `.env` file that is gitignored. The backend SHALL load this file automatically on startup (via `python-dotenv` or equivalent). Developers MAY point `DATABASE_URL` at the Supabase dev database or a local Postgres instance.

#### Scenario: Local .env loaded on dev startup
- **WHEN** the FastAPI dev server starts locally
- **THEN** it reads `DATABASE_URL` from `.env` without requiring the developer to export environment variables manually
