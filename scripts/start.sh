#!/bin/sh
# =============================================================================
# Railway / Docker Startup Script
# =============================================================================
# This script runs BEFORE the Next.js server starts.
# It tries to create tables and seed data, but ALWAYS starts the server.
# =============================================================================

echo "🚀 Starting Hospital Survey System..."

# ---- Step 1: Try to create database tables ----
if [ -n "$DATABASE_URL" ]; then
  echo "📊 DATABASE_URL is set. Setting up database..."

  echo "📦 Creating database tables..."
  npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  prisma db push failed (tables may already exist)"

  echo "🌱 Seeding database..."
  npx tsx prisma/seed-production.ts 2>&1 || echo "⚠️  Seeding failed (data may already exist)"
else
  echo "⚠️  DATABASE_URL not set. Skipping database setup."
  echo "   You can set it in Railway → Variables, then visit /api/setup"
fi

# ---- Step 2: Start the Next.js server ----
# This MUST always run, even if DB setup failed above
echo ""
echo "🌐 Starting Next.js server on port ${PORT:-3000}..."
exec npx next start -p ${PORT:-3000} -H 0.0.0.0
