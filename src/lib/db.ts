import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma optimization for serverless (Vercel, AWS Lambda, etc.)
// - Connection pooling via DATABASE_URL (Neon pg_bouncer / Supabase pooler)
// - Reuse connection across warm lambda invocations
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
    // In serverless, limit connection pool to avoid exhausting database connections
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// In development, reuse the client to avoid creating new connections on every HMR reload
// In serverless (production), the client is created fresh per cold start
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
