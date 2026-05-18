import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please set it in your deployment platform (Railway, Vercel, etc.) or .env file.'
    )
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma

  const client = createPrismaClient()

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }

  return client
}

// Lazy Proxy — PrismaClient is only created when a db method is actually called.
// During `next build`, modules are imported but db methods are never called,
// so PrismaClient is never instantiated — NO CRASH!
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return (getDb() as any)[prop]
  },
})