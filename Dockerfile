# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# ── 1. Dependencies ─────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── 2. Build ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV WEBPACK_PARALLELISM=1

RUN rm -rf .next && npx next build

# ── 3. Runner ─────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# libc6-compat needed for sharp / native modules at runtime
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public           ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/migrations       ./migrations
COPY --from=builder /app/start.js         ./start.js

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# start.js: lightweight health proxy on :3000 that instantly answers
# /api/health while Next.js boots on :3001. Critical for Timeweb
# healthcheck which times out after 3 minutes.
CMD ["node", "start.js"]
