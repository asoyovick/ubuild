#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${PORT:-3000}"

echo "Starting UBuild backend API on :${BACKEND_PORT}..."
cd backend
./bin/api &
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
cd ../frontend
exec npm run start
