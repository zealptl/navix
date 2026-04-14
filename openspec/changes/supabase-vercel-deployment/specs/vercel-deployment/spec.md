## ADDED Requirements

### Requirement: Monorepo deployed to Vercel from a single GitHub repository
The repository SHALL contain a `vercel.json` at the root that configures Vercel to build both the FastAPI backend (as Python serverless functions) and the Vite frontend (as a static build) from the same repo. Pushing to the `main` branch SHALL trigger an automatic Vercel deployment.

#### Scenario: Push to main triggers deploy
- **WHEN** a commit is pushed to the `main` branch on GitHub
- **THEN** Vercel automatically builds and deploys both frontend and backend

#### Scenario: Preview deploy on pull request
- **WHEN** a pull request is opened against `main`
- **THEN** Vercel creates a preview deployment with a unique URL

### Requirement: API routes proxied to FastAPI serverless function
All requests to `/api/*` SHALL be routed by Vercel to the FastAPI application running as a Python serverless function. All other requests SHALL be served from the Vite static build output.

#### Scenario: API request routed correctly
- **WHEN** a browser requests `/api/stars/famous`
- **THEN** Vercel routes the request to the FastAPI handler and returns JSON

#### Scenario: Frontend asset served correctly
- **WHEN** a browser requests `/` or any non-API path
- **THEN** Vercel serves the built React app's `index.html` or static asset

### Requirement: Frontend configured for same-origin API in production
The Vite frontend SHALL use a `VITE_API_BASE_URL` environment variable to construct API URLs. In production (Vercel), this variable SHALL be empty so all `/api/*` calls are same-origin. In local development it SHALL be `http://localhost:8000`.

#### Scenario: Production API calls are same-origin
- **WHEN** the frontend is served from the Vercel deployment URL
- **THEN** all fetch calls go to `/api/...` on the same domain with no CORS issue

#### Scenario: Local dev API calls proxy to local FastAPI
- **WHEN** the frontend runs via `vite dev` locally
- **THEN** fetch calls use `http://localhost:8000/api/...` to reach the local FastAPI server

### Requirement: FastAPI CORS updated for production domain
The FastAPI CORS middleware `allow_origins` list SHALL include the production Vercel domain in addition to `http://localhost:5173`. The production origin SHALL be read from a `FRONTEND_ORIGIN` environment variable so it does not need to be hardcoded.

#### Scenario: Production CORS allows Vercel frontend
- **WHEN** the Vercel-deployed frontend calls the API
- **THEN** the CORS headers permit the request and the browser does not block it
