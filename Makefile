SHELL := /bin/sh
.DEFAULT_GOAL := help

GO ?= go
NPM ?= npm
DOCKER ?= docker
RENDER_API ?= https://api.render.com/v1
RENDER_BRANCH ?= develop
PG_CONTAINER ?= ubuild-postgres-dev
PG_VOLUME ?= ubuild-postgres

.PHONY: help install db db-up db-down backend frontend dev test check migrate migrate-postgres import-json deploy-check deploy-api deploy-frontend deploy

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"; print "UBuild commands:"} /^[a-zA-Z_-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install frontend dependencies
	cd frontend && $(NPM) ci

db: db-up ## Alias for db-up (starts local PostgreSQL)

db-up: ## Start local PostgreSQL (development credentials only)
	@$(DOCKER) start $(PG_CONTAINER) >/dev/null 2>&1 || $(DOCKER) run -d --name $(PG_CONTAINER) --restart unless-stopped -e POSTGRES_DB=ubuild -e POSTGRES_USER=ubuild -e POSTGRES_PASSWORD=ubuild -p 5432:5432 -v $(PG_VOLUME):/var/lib/postgresql/data --health-cmd='pg_isready -U ubuild -d ubuild' --health-interval=5s --health-timeout=5s --health-retries=10 postgres:16-alpine
	@attempt=0; until $(DOCKER) exec $(PG_CONTAINER) pg_isready -U ubuild -d ubuild >/dev/null 2>&1; do attempt=$$((attempt + 1)); if [ $$attempt -ge 30 ]; then echo "PostgreSQL did not become ready." >&2; exit 1; fi; sleep 1; done

db-down: ## Stop local PostgreSQL without deleting its data
	$(DOCKER) stop $(PG_CONTAINER)

backend: ## Run the Go API (DATABASE_URL must be set or use local defaults)
	cd backend && $(GO) run ./cmd/api

frontend: ## Run the Next.js frontend
	cd frontend && $(NPM) run dev

dev: db-up ## Run PostgreSQL, Go API, and Next.js frontend concurrently
	@echo "Starting Go API on :8080 and Next.js on :3000..."
	@(cd backend && $(GO) run ./cmd/api) & B_PID=$$!; \
	(cd frontend && $(NPM) run dev) & F_PID=$$!; \
	trap 'kill $$B_PID $$F_PID 2>/dev/null || true' EXIT INT TERM; \
	wait

test: ## Run Go and frontend tests, lint, and production build
	cd backend && $(GO) test ./... && $(GO) vet ./... && $(GO) build ./cmd/api ./cmd/import-json ./cmd/migrate-sqlite-postgres
	cd frontend && $(NPM) run lint && $(NPM) run build && $(NPM) run test:registration

check: test ## Run all checks before deployment

migrate: migrate-postgres ## Alias for migrate-postgres

migrate-postgres: ## Copy the existing SQLite database to DATABASE_URL (one-time)
	@test -n "$$DATABASE_URL" || { echo "Set DATABASE_URL to the empty PostgreSQL target first." >&2; exit 1; }
	cd backend && $(GO) run ./cmd/migrate-sqlite-postgres -source ./data/ubuild.db -target "$$DATABASE_URL"

import-json: ## Import legacy JSON files directly to DATABASE_URL (one-time)
	@test -n "$$DATABASE_URL" || { echo "Set DATABASE_URL to the empty PostgreSQL target first." >&2; exit 1; }
	cd backend && $(GO) run ./cmd/import-json -source ../data -database "$$DATABASE_URL"

deploy-check: ## Verify clean, pushed deployment branch; never commits or pushes
	@test -n "$$RENDER_API_KEY" || { echo "Set RENDER_API_KEY in your shell." >&2; exit 1; }
	@test -n "$$RENDER_API_SERVICE_ID" || { echo "Set RENDER_API_SERVICE_ID in your shell." >&2; exit 1; }
	@test -n "$$RENDER_FRONTEND_SERVICE_ID" || { echo "Set RENDER_FRONTEND_SERVICE_ID in your shell." >&2; exit 1; }
	@test "$$(git branch --show-current)" = "$(RENDER_BRANCH)" || { echo "Checkout $(RENDER_BRANCH) before deploying." >&2; exit 1; }
	@test -z "$$(git status --porcelain)" || { echo "Commit or stash local changes before deploying; this target deploys the pushed branch only." >&2; exit 1; }
	@git fetch --quiet origin $(RENDER_BRANCH)
	@test "$$(git rev-parse HEAD)" = "$$(git rev-parse origin/$(RENDER_BRANCH))" || { echo "Push the checked-out commit to origin/$(RENDER_BRANCH) before deploying." >&2; exit 1; }

deploy-api: ## Request deployment of the Go API on Render
	@test -n "$$RENDER_API_KEY" || { echo "Set RENDER_API_KEY in your shell." >&2; exit 1; }
	@test -n "$$RENDER_API_SERVICE_ID" || { echo "Set RENDER_API_SERVICE_ID in your shell." >&2; exit 1; }
	@curl --fail --silent --show-error -X POST \
		-H "Authorization: Bearer $$RENDER_API_KEY" \
		-H "Accept: application/json" \
		"$(RENDER_API)/services/$$RENDER_API_SERVICE_ID/deploys"

deploy-frontend: ## Request deployment of the Next.js frontend on Render
	@test -n "$$RENDER_API_KEY" || { echo "Set RENDER_API_KEY in your shell." >&2; exit 1; }
	@test -n "$$RENDER_FRONTEND_SERVICE_ID" || { echo "Set RENDER_FRONTEND_SERVICE_ID in your shell." >&2; exit 1; }
	@curl --fail --silent --show-error -X POST \
		-H "Authorization: Bearer $$RENDER_API_KEY" \
		-H "Accept: application/json" \
		"$(RENDER_API)/services/$$RENDER_FRONTEND_SERVICE_ID/deploys"

deploy: ## Test, verify pushed branch, then deploy API and frontend to Render
	+$(MAKE) check
	+$(MAKE) deploy-check
	+$(MAKE) deploy-api
	+$(MAKE) deploy-frontend
