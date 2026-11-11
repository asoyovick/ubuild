# Build stage: compile the Go API and build the Next.js frontend
# Build with a supported Go toolchain. Go 1.22 is end-of-life and no longer
# receives standard library security fixes; go.mod requires 1.25 for the
# patched pgx release.
FROM golang:1.25-alpine AS backend-build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./backend/
RUN cd backend && CGO_ENABLED=0 go build -o bin/api ./cmd/api

FROM node:22-alpine AS frontend-build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV NODE_ENV=production
ENV UBUILD_API_URL=http://127.0.0.1:8080
RUN npm run build

# Runtime image
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache bash curl

# Backend binary + migrations (needed at runtime for schema init)
COPY --from=backend-build /src/backend/bin/api ./backend/bin/api
COPY --from=backend-build /src/backend/migrations ./backend/migrations

# Frontend build output
COPY --from=frontend-build /src/.next ./frontend/.next
COPY --from=frontend-build /src/public ./frontend/public
COPY --from=frontend-build /src/node_modules ./frontend/node_modules
COPY --from=frontend-build /src/package.json ./frontend/package.json
COPY --from=frontend-build /src/next.config.ts ./frontend/next.config.ts

# Ensure upload dir exists
RUN mkdir -p /app/backend/data/uploads

# Startup script
COPY scripts/start-services.sh ./scripts/start-services.sh
RUN chmod +x scripts/start-services.sh

# Runtime env
ENV PORT=3000
ENV BACKEND_PORT=8080
ENV HOST=0.0.0.0
ENV UBUILD_API_URL=http://127.0.0.1:8080

EXPOSE 3000

CMD ["bash", "scripts/start-services.sh"]
