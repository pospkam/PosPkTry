# syntax=docker/dockerfile:1
# KAMCHATOUR HUB — Production Dockerfile
# BuildKit required (Docker 18.09+). Timeweb Cloud поддерживает BuildKit.

FROM node:20-alpine AS base

# ── 1. Зависимости ─────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev \
    --fetch-retries=3 \
    --fetch-retry-mintimeout=10000 \
    --fetch-retry-maxtimeout=60000

# ── 2. Сборка ──────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=6144"

# Full rebuild without cache mount to clear stale outputFileTracingExcludes cache
RUN rm -rf .next && npm run build

# ── 3. Продакшн-образ ──────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public           ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/migrations       ./migrations

# Run as root to avoid EACCES on prerender cache writes
# USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
