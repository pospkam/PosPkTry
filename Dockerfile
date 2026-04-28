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
ENV NODE_OPTIONS="--max-old-space-size=6144"

# Clean
RUN rm -rf .next

# Build: capture all output to file, then echo it regardless of success/fail
# This ensures Timeweb logs show the actual build error
RUN npx next build > /tmp/build-stdout.log 2>&1; BUILD_EXIT=$?; cat /tmp/build-stdout.log; exit $BUILD_EXIT

# ── 3. Runner ─────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public           ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/migrations       ./migrations

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
