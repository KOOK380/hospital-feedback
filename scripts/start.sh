#!/bin/sh
# =============================================================================
# Railway / Docker Startup Script
# =============================================================================

set -e

echo "🚀 Starting Hospital Survey System..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  echo "   Please add DATABASE_URL in Railway → Variables"
  echo "   Starting server anyway (setup endpoint will be available)..."
else
  echo "📊 DATABASE_URL is set (length: $(echo -n "$DATABASE_URL" | wc -c) chars)"

  echo ""
  echo "📦 Step 1: Creating database tables (prisma db push)..."
  npx prisma db push --accept-data-loss 2>&1 || {
    echo "⚠️  prisma db push failed, but continuing (tables may already exist)"
  }

  echo ""
  echo "🌱 Step 2: Seeding database with demo data..."
  npx tsx prisma/seed-production.ts 2>&1 || {
    echo "⚠️  Seeding had issues (data may already exist), continuing..."
  }
fi

echo ""
echo "🌐 Step 3: Starting Next.js server on port ${PORT:-3000}..."
if [ -f "server.js" ]; then
  echo "   Using standalone server.js"
  exec node server.js
else
  echo "   Using next start"
  exec npx next start -p ${PORT:-3000}
fi