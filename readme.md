# HELM Project Manager

A web-based application to manage project tasks, risks, requirements, and effort tracking.

## Requirements
- Node.js 20+ (matches the Docker image)
- Docker + Docker Compose

## Download the project

### Option 1: Clone with Git (recommended)
```bash
git clone <your-repo-url>
cd Helm-Project-Manager
```

### Option 2: Download ZIP from Git hosting
1. Open your repository page.
2. Click **Code** (or equivalent) → **Download ZIP**.
3. Extract the archive.
4. Open a terminal in the extracted `Helm-Project-Manager` folder.

## Install Docker on Linux, Windows, and macOS

> This project uses Docker Compose (`docker compose`) to run the app and PostgreSQL together.

### Linux (Ubuntu/Debian)

Install Docker Engine + Compose plugin:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Optional (run Docker without `sudo`):

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Start and enable Docker:

```bash
sudo systemctl enable --now docker
```

### Windows 10/11

1. Install **Docker Desktop for Windows** from Docker's official website.
2. During installation, allow the installer to enable **WSL 2** integration if prompted.
3. Reboot if required.
4. Launch Docker Desktop and wait until it shows "Engine running".
5. In Docker Desktop settings, ensure **Use WSL 2 based engine** is enabled.

### macOS (Intel or Apple Silicon)

1. Install **Docker Desktop for Mac** from Docker's official website.
2. Open the downloaded `.dmg` and drag Docker to Applications.
3. Start Docker Desktop and finish first-run setup.
4. Wait until Docker shows as running in the menu bar.

### Verify Docker + Compose installation (all OS)

Run:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

If these commands succeed, Docker is ready for this project.

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
4. Stop the stack when finished:
   ```bash
   docker compose down
   ```

### Common Docker commands for daily use

```bash
# Start in background
docker compose up -d --build

# View logs
docker compose logs -f

# Restart containers
docker compose restart

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (deletes DB data)
docker compose down -v
```

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
