---
title: UBuild Deployment
---

# Deployment

UBuild is deployed to [Render](https://render.com) as a **single web service** that runs both the Go backend API and the Next.js frontend in one container.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Render web service                   │
│  ┌──────────────┐         ┌──────────────────────────┐  │
│  │  Next.js     │  :3000  │  Go API (internal)      │  │
│  │  (public)    │ ─────── │  :8080 ( proxied via     │  │
│  │              │         │   /api/backend/* )       │  │
│  └──────────────┘         └──────────────────────────┘  │
│                    CMD: bash scripts/start-services.sh  │
└─────────────────────────────────────────────────────────┘
```

- **Frontend**: Next.js on port `3000`, public-facing.
- **Backend**: Go API on port `8080`, internal only (not exposed to the internet).
- **Proxy**: `GET/POST /api/backend/*` routes are forwarded to the backend via `app/api/backend/[...path]/route.ts`.
- **Database**: PostgreSQL (Supabase in production, local Docker in development).

## Quick start (local Docker)

```bash
# 1. Start PostgreSQL + the bundled app container
docker compose up --build

# 2. Open http://localhost:3000
```

The `docker-compose.yml` defines two services:
- `db` — PostgreSQL 16 (port 5432, volume `pgdata`).
- `app` — the production Docker image, connects to `db` via the internal Docker network.

The `docker-compose.override.yml` is for local development with bind mounts; it is automatically merged by `docker compose` when present.

## Local development without Docker

```bash
# Terminal 1 — PostgreSQL (requires Docker)
make db-up

# Terminal 2 — Go API
make backend

# Terminal 3 — Next.js dev server
make frontend

# Or all three concurrently (PostgreSQL + API + frontend)
make dev
```

Environment variables are read from `backend/.env` (Go) and `frontend/.env.local` (Next.js). Copy the `.env.example` files and fill in real values.

## Database migrations

The Go backend applies the schema from `backend/migrations/001_init.sql` on every startup (idempotent `CREATE TABLE IF NOT EXISTS`). For the initial migration from the legacy SQLite database to PostgreSQL:

```bash
# Set DATABASE_URL to the empty PostgreSQL target
export DATABASE_URL=postgres://ubuild:ubuild@localhost:5432/ubuild?sslmode=disable

# One-time migration
make migrate
# or: go run ./backend/cmd/migrate-sqlite-postgres -source ./backend/data/ubuild.db -target "$DATABASE_URL"
```

To import legacy JSON files directly:

```bash
export DATABASE_URL=postgres://ubuild:ubuild@localhost:5432/ubuild?sslmode=disable
make import-json
# or: go run ./backend/cmd/import-json -source ./backend/data -database "$DATABASE_URL"
```

## Render deployment

The `render.yaml` at the repo root configures a single Render web service:

- **Name**: `ubuild`
- **Runtime**: `node` (Node 22)
- **Build command**:
  ```bash
  cd backend && go build -o bin/api ./cmd/api
  cd ../frontend && npm ci && npm run build
  ```
- **Start command**: `bash scripts/start-services.sh`
- **Health check**: `GET /` (proxied to Next.js)
- **Env vars**:
  - `NODE_VERSION=22`
  - `PORT=3000`
  - `BACKEND_PORT=8080`
  - `NEXT_PUBLIC_SITE_URL` (sync: false — set per environment)
  - `NEXT_PUBLIC_API_BASE_URL=/api/backend`
  - `UBUILD_API_URL=http://127.0.0.1:8080`
  - `DATABASE_URL` (sync: false — set per environment)
  - `UBUILD_ALLOWED_ORIGIN` (sync: false)
  - `UBUILD_COOKIE_SECURE=true`
  - `UBUILD_UPLOAD_DIR=/app/backend/data/uploads`

### Manual deploy (Makefile)

```bash
# Requires RENDER_API_KEY, RENDER_API_SERVICE_ID,
# RENDER_FRONTEND_SERVICE_ID, and RENDER_BRANCH (default: develop)
# in your shell environment.

make check          # Verify clean, pushed branch
make deploy-check   # Alias for check (redundant guard)
make deploy-api     # Trigger API deploy via Render API
make deploy-frontend # Trigger frontend deploy via Render API

# One-step deploy (runs check + deploy-api + deploy-frontend)
make deploy
```

> The `make deploy` target expects the `develop` branch to be pushed and clean. Adjust `RENDER_BRANCH` if you deploy from `main`.

### Environment variables on Render

Render UI env vars to set (or add to `render.yaml` — note the `sync: false` ones are not committed):

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Provider-managed PostgreSQL (Supabase or Render DB) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.onrender.com` | Base URL for emails/redirects |
| `UBUILD_ALLOWED_ORIGIN` | `https://your-app.onrender.com` | CORS origin for the API |
| `UBUILD_COOKIE_SECURE` | `true` | Already set in `render.yaml` |

## Dockerfile

The `Dockerfile` builds a single image with both services:

1. **Build stage** (`node:22-alpine`):
   - Downloads Go modules and builds `backend/bin/api`.
   - Runs `npm ci` + `npm run build` for Next.js, with `UBUILD_API_URL=http://127.0.0.1:8080` baked in.
2. **Runtime stage** (`node:22-alpine`):
   - Copies the backend binary, `.next` output, `public/`, `node_modules/`, and `scripts/start-services.sh`.
   - Sets `PORT=3000`, `BACKEND_PORT=8080`, `UBUILD_API_URL=http://127.0.0.1:8080`.
   - Runs `bash scripts/start-services.sh` which starts the backend, waits for health, then starts Next.js.

## Environment reference

### Backend (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `UBUILD_API_ADDR` | `:8080` | Address the Go API listens on |
| `DATABASE_URL` | `postgres://ubuild:ubuild@localhost:5432/ubuild?sslmode=disable` | PostgreSQL connection string |
| `UBUILD_ALLOWED_ORIGIN` | `http://localhost:3000` | CORS origin |
| `UBUILD_COOKIE_SECURE` | `false` | Secure cookie flag |
| `UBUILD_UPLOAD_DIR` | `data/uploads` | Document upload storage path |

### Frontend (`frontend/.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Base URL (emails, redirects) |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/backend` | Browser-facing API path (proxied) |
| `UBUILD_API_URL` | `http://localhost:8080` | Server-side backend URL |

## Troubleshooting

- **Backend not ready**: The startup script waits up to 30s for `GET /healthz` on the backend port. Check Render logs for the backend startup message.
- **`UBUILD_API_URL is not configured for production`**: The frontend proxy requires `UBUILD_API_URL` to be set and not `http://localhost*`. Set it to `http://127.0.0.1:8080` in the Render service env vars.
- **Uploads not persisting**: The `UBUILD_UPLOAD_DIR` must point to a persistent volume. On Render, use a disk mount or external storage. The current `render.yaml` sets it to `/app/backend/data/uploads` which is ephemeral on the free tier — consider adding a Render Disk or switching to object storage.
