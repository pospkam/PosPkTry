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

# Step 1: Run build, capture output, DON'T fail here (use || true)
RUN npx next build > /tmp/build.txt 2>&1 || true

# Step 2: Show the output (will appear in Timeweb logs regardless)
RUN echo "=== BUILD LOG START ===" && cat /tmp/build.txt && echo "=== BUILD LOG END ==="

# Step 3: Check if standalone was produced
RUN test -f .next/standalone/server.js && echo "BUILD SUCCESS" || (echo "BUILD FAILED: no server.js" && exit 1)

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
