import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// =============================================================================
// LAZY PrismaClient — prevents crash during `next build`
// =============================================================================
// PrismaClient is only created when a property is actually ACCESSED on `db`.
// During `next build`, modules are imported but no properties are accessed
// on `db` (all usage is inside route handler functions), so PrismaClient
// is never instantiated — zero crashes!
// =============================================================================

let _client: PrismaClient | null = null

function getClient(): PrismaClient {
  // Reuse cached client in development (HMR)
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  if (_client) return _client

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your environment variables.'
    )
  }

  _client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  })

  // In development, cache on global to survive HMR reloads
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _client
  }

  return _client
}

// Internal JavaScript properties that should NOT trigger PrismaClient creation.
// These are accessed by the runtime/bundler and must return undefined.
const SKIP_PROPS = new Set([
  'constructor',
  'prototype',
  '__proto__',
  '__esModule',
  'then',       // Prevents "thenable" confusion with await
  'toJSON',
  'toString',
  'valueOf',
])

// Single-level lazy Proxy
// - Access like `db.user` returns the real Prisma model delegate
// - Access like `db.$queryRaw` returns the real PrismaClient method bound to the client
// - PrismaClient is ONLY created when a non-internal property is accessed
// - Works perfectly with tagged template literals: db.$queryRaw`SELECT ...`
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    // Skip symbol properties (Symbol.toStringTag, Symbol.toPrimitive, Symbol.iterator, etc.)
    if (typeof prop === 'symbol') return undefined

    // Skip internal JS properties
    if (SKIP_PROPS.has(String(prop))) return undefined

    // Create PrismaClient lazily — only when a real property is accessed
    const client = getClient()
    const value = Reflect.get(client, prop, client)

    // Bind functions to the client so `this` is correct
    // This is critical for $queryRaw, $transaction, $executeRaw, etc.
    if (typeof value === 'function') {
      return value.bind(client)
    }

    // For model delegates (db.user, db.survey, etc.), return as-is
    // They're objects with their own methods, not functions
    return value
  },
})
