# HELM Project Manager

Web app for project settings, requirements, effort tracking, risks, and team management.

These instructions were checked against the current repo scripts on March 30, 2026.

## Requirements

- Node.js 20+ for local runs
- npm
- Docker Desktop or Docker Engine with `docker compose`

The repo currently uses:

- app port `3040`
- Postgres host port `5437`
- PostgreSQL 16 in Docker

## First-time setup

1. Open a terminal in the project root:

```powershell
cd "O:\Projects\Helm Project Manager"
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

4. Edit `.env` before starting the app.

Minimum values to check:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST=localhost` for local host runs
- `POSTGRES_PORT=5437` for the Docker database exposed on your machine
- `FRONTEND_BASE_URL=http://localhost:3040`

Notes:

- `FRONTEND_BASE_URL` should include the scheme (`http://`), not just `localhost:3040`.
- SMTP settings are optional for basic startup. The app will run without them, but email-based flows will fail until `SMTP_*` values are configured.

## Recommended dev workflow

This is the easiest way to work on the app locally: Postgres in Docker, Node app on your machine.

1. Start the database:

```bash
docker compose up -d db
```

2. Start the app in dev mode:

```bash
npm run dev
```

What this does:

- `npm run dev` runs `npm run db-init` first
- `scripts/init-db.js` creates the database if needed
- base SQL in `sql/` is applied
- migrations in `sql/migrations/` are applied
- `sql/README.md` is refreshed from the live schema

3. Open the app:

- `http://localhost:3040/`
- login is available from `#/login`

4. Sign in with the admin user from your `.env`:

- username: `ADMIN_USERNAME`
- password: `ADMIN_PASSWORD`

## Full Docker workflow

If you want both the app and Postgres in Docker:

```bash
docker compose up --build
```

Then open `http://localhost:3040/`.

Important:

- The Docker image copies `.env` into the image during build.
- If you change `.env`, rebuild the app container:

```bash
docker compose up -d --build
```

Useful commands:

```bash
docker compose logs -f
docker compose down
docker compose down -v
```

`docker compose down -v` deletes the local Postgres volume.

## Running tests

The automated tests use `.env.test` and a separate `helm_test` database.

1. Make sure the Docker Postgres container is running:

```bash
docker compose up -d db
```

2. Create the test role and database once:

```bash
node --env-file=.env scripts/create-test-db.js
```

3. Run the test suite:

```bash
npm test
```

`npm test` runs `npm run db-init:test` automatically before the tests.

## Common commands

```bash
npm run db-init
npm run dev
npm start
npm test
docker compose up -d db
docker compose up -d --build
docker compose down
```

## Troubleshooting

- If the app cannot connect to Postgres from your host machine, make sure `.env` uses `POSTGRES_HOST=localhost` and `POSTGRES_PORT=5437`.
- If the app cannot connect inside the full Docker stack, rebuild with `docker compose up -d --build` after env changes.
- If login emails or password reset emails fail, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_EMAIL_FROM`.
