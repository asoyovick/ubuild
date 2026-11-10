#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${PORT:-3000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

mkdir -p "$APP_DIR/backend/data/uploads"
[[ -d "$APP_DIR/backend/migrations/postgres" ]] || mkdir -p "$APP_DIR/backend/migrations/postgres"

echo "Starting UBuild backend API on :${BACKEND_PORT}..."
cd "$APP_DIR/backend"

UBUILD_API_ADDR="0.0.0.0:${BACKEND_PORT}" ./bin/api &
BACKEND_PID=$!

cleanup() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Waiting for backend to become ready..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/healthz" >/dev/null 2>&1; then
    echo "Backend is ready on :${BACKEND_PORT}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Backend did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

echo "Starting Next.js on :${FRONTEND_PORT}..."
export UBUILD_UPLOAD_DIR="$APP_DIR/backend/data/uploads"
cd "$APP_DIR/frontend"
exec npm run start -- -p "${FRONTEND_PORT}" -H "0.0.0.0"
