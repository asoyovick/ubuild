# UBuild

UBuild is a construction project coordination application with an existing Next.js frontend and a Go REST API backend.

```text
frontend/   Next.js App Router UI
backend/    Go API, PostgreSQL migrations and tests
docs/       Architecture and migration notes, including the marketplace and project-funds design
```

## Run locally

Start the local PostgreSQL container and API (from `backend/`):

```bash
docker start ubuild-postgres-dev 2>/dev/null || docker run -d --name ubuild-postgres-dev --restart unless-stopped -e POSTGRES_DB=ubuild -e POSTGRES_USER=ubuild -e POSTGRES_PASSWORD=ubuild -p 5432:5432 -v ubuild-postgres:/var/lib/postgresql/data postgres:16-alpine
cp .env.example .env
set -a; . ./.env; set +a
go run ./cmd/api
```

The migration command requires an empty PostgreSQL database. This working copy's SQLite records have already been copied into the local PostgreSQL database; do not rerun the migration here. On a fresh install with an existing SQLite source, run `go run ./cmd/migrate-sqlite-postgres -source ./data/ubuild.db` once after setting `DATABASE_URL` and before starting the API.

In a second terminal (from `frontend/`):

```bash
cp .env.example .env.local
npm ci
npm run dev
```

The frontend runs at `http://localhost:3000`; the API listens at `http://localhost:8080`. The frontend proxies browser API calls to Go and sends server-rendered dashboard requests to the configured `UBUILD_API_URL`.

## Migrate existing data to PostgreSQL

The preserved migration source is `backend/data/ubuild.db` (SQLite), originally imported from legacy root `data/*.json`. Its records have already been copied into this checkout's local PostgreSQL container. For another environment, start PostgreSQL, set `DATABASE_URL` in `backend/.env`, then run the one-time SQLite-to-PostgreSQL copy before starting the API:

```bash
go run ./cmd/migrate-sqlite-postgres -source ./data/ubuild.db
```

The migration copies users (including compatible password hashes), sessions, projects, memberships, invitations, audit entries, password resets, contacts, and newsletter signups in one PostgreSQL transaction. The command refuses to migrate into a PostgreSQL database that already contains users. It does not modify or delete the SQLite source. Keep a backup and verify counts before switching production traffic.

For a fresh environment with legacy JSON but no SQLite database, import JSON directly with `go run ./cmd/import-json -source ../data -database "$DATABASE_URL"` instead. The ignored SQLite file in this checkout remains available as a backup/source; it is not deleted by the transfer.

## Checks

```bash
# backend/
go test ./...
go build ./cmd/api

# frontend/
npm run lint
npm run build
```

## Make targets and deployment

Run `make help` to list project commands. Common targets are `make db-up`, `make backend`, `make frontend`, and `make test`.

The Render deployment target tests both applications, then requests deployment of the Go API and Next.js frontend. It deliberately does **not** commit or push. Before running it, commit and push the reviewed changes to the configured `develop` branch, then provide Render credentials and service IDs in your shell:

```bash
export RENDER_API_KEY="..."
export RENDER_API_SERVICE_ID="srv-..."
export RENDER_FRONTEND_SERVICE_ID="srv-..."
make deploy
```

`make deploy` refuses to proceed with a dirty working tree, the wrong branch, or a commit that is not pushed to `origin/develop`. Keep `RENDER_API_KEY` and `DATABASE_URL` out of frontend environment variables and source control.

## Migration status

Registration, login, logout, profile lookup, project listing/creation, project detail authorization, and owner membership creation are implemented in Go. The same Go backend now also implements the construction marketplace (opportunities and applications), engagements and variations, project funds and allocations, payment requests and revisions, collaboration messages, and professional financial visibility, all on the shared project/user/engagement/document records covered by migrations `001`–`004`. The existing Next.js visual experience remains intact; see [`docs/migration-status.md`](docs/migration-status.md). Where a capability is not implemented, the UI reports that clearly and does not populate mock data.

PostgreSQL is the Go backend's default and production database (`DATABASE_URL` is backend-only). Go generates cryptographically random session tokens and stores only their SHA-256 digests. Render now provisions a PostgreSQL database. The contact form and newsletter are still served by Next.js while those endpoints await migration.
