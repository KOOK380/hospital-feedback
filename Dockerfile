# =============================================================================
# Hospital Survey System - Railway / Docker Deployment
# =============================================================================
# This Dockerfile auto-creates tables and seeds data on container startup.
# It does NOT use standalone mode — simpler and more reliable.
# =============================================================================

FROM node:20-alpine AS base

# ---- Dependencies Stage ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
COPY prisma ./prisma/

# Install dependencies
RUN \
  if [ -f bun.lock ]; then \
    npm install -g bun && bun install; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

# ---- Build Stage ----
FROM base AS builder
WORKDIR /app

# Set a dummy DATABASE_URL during build so PrismaClient doesn't crash.
# Overridden at runtime by Railway's actual DATABASE_URL.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?connect_timeout=1"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Production Stage ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ---- Copy built application ----
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# ---- Copy startup script ----
COPY --from=builder /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Create uploads directory and set permissions
RUN mkdir -p public/uploads
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Startup script creates tables + seeds data before starting server
CMD ["sh", "./start.sh"]