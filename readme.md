# HELM Project Manager

A web-based application to manage project tasks, risks, requirements, and effort tracking.

## Requirements
- Node.js 20+ (matches the Docker image)
- Docker + Docker Compose

## Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file by copying `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and set at least:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

## Running with Docker (full stack)
This brings up the app and Postgres using `docker-compose.yml`.

1. Ensure `.env` has the required values (see Installation above).
2. Start the stack:
   ```bash
   docker compose up --build
   ```
3. Open the app at `http://localhost:3040` (or your `PORT`).

## Dev mode (Docker DB + local server)
Run Postgres in Docker and the app on your machine with `npm run dev`.

1. Start only the database container:
   ```bash
   docker compose up -d db
   ```
2. Confirm your `.env` points to the Docker DB from your host:
   - `POSTGRES_HOST=localhost`
   - `POSTGRES_PORT` must match the host port in `docker-compose.yml`
3. Start the dev server (this also runs DB init via `predev`):
   ```bash
   npm run dev
   ```

## Database init + admin seed
The DB is initialized by `scripts/init-db.js`, which:
- runs all SQL files in `sql/` in order
- applies migrations in `sql/migrations/`
- updates `sql/README.md` with the current schema

Admin user seeding comes from `sql/002_seed_admin.sql` and uses `.env` values:
- Required: `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- Optional: `ADMIN_EMAIL` (defaults to `${ADMIN_USERNAME}@helm.local`)
- Optional: `ADMIN_FIRST_NAME` (default `Admin`), `ADMIN_LAST_NAME` (default `User`)
- Optional: `PASSWORD_EXPIRATION_DAYS` (default `90`), `PASSWORD_MIN_LENGTH` (default `8`)

The seed uses `ON CONFLICT DO NOTHING`, so it will not overwrite an existing admin user.
Default security answers in the seed are `blue`, `springfield`, and `fluffy`.
