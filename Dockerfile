# =============================================================================
# Hospital Survey System - Railway / Docker Deployment
# =============================================================================

FROM node:20-alpine AS base

# ---- Dependencies Stage ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
COPY prisma ./prisma/

RUN \
  if [ -f bun.lock ]; then \
    npm install -g bun && bun install; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

RUN npx prisma --version || true

# ---- Build Stage ----
FROM base AS builder
WORKDIR /app

ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?connect_timeout=1"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Production Stage ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

COPY --from=builder /app/node_modules/tsx ./node_modules/tsx

RUN mkdir -p /app/node_modules/esbuild /app/node_modules/@esbuild
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild

COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

COPY --from=builder /app/prisma/seed-production.ts ./prisma/seed-production.ts

COPY --from=builder /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

RUN mkdir -p public/uploads
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "./start.sh"]