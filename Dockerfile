# Build stage: compile the Go API and build the Next.js frontend
FROM node:22-alpine AS build
WORKDIR /src

# --- Backend ---
COPY backend/go.mod backend/go.sum ./
RUN cd backend && go mod download
COPY backend/ ./backend/
RUN cd backend && go build -o bin/api ./cmd/api

# --- Frontend ---
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

# Backend binary
COPY --from=build /src/backend/bin/api ./backend/bin/api

# Frontend build output (server-rendered Next.js needs .next/server + public)
COPY --from=build /src/.next ./frontend/.next
COPY --from=build /src/public ./frontend/public
COPY --from=build /src/node_modules ./frontend/node_modules
COPY --from=build /src/package.json ./frontend/package.json
COPY --from=build /src/next.config.ts ./frontend/next.config.ts

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
