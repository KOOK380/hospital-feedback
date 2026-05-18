import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// =============================================================================
// ULTRA-LAZY PrismaClient — prevents crash during `next build`
// =============================================================================
// Uses a DOUBLE-NESTED Proxy that only creates PrismaClient when a
// method is actually INVOKED (called with arguments), not just when
// properties are accessed. During build, modules are imported but
// methods are never invoked, so PrismaClient is never instantiated.
// =============================================================================

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your environment variables.'
    )
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
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

const innerProxyHandler: ProxyHandler<any> = {
  get(_target, innerProp: string | symbol) {
    return (...args: any[]) => {
      const client = getDb()
      const model = (client as any)[_target.__modelProp]
      const method = (model as any)[innerProp]
      if (typeof method === 'function') {
        return method.apply(model, args)
      }
      return method
    }
  },
  apply(_target, _thisArg, args: any[]) {
    const client = getDb()
    const method = (client as any)[_target.__modelProp]
    if (typeof method === 'function') {
      return method.apply(client, args)
    }
    return method
  },
}

const outerProxyHandler: ProxyHandler<any> = {
  get(_target, prop: string | symbol) {
    return new Proxy(
      { __modelProp: prop },
      innerProxyHandler
    )
  },
}

export const db: PrismaClient = new Proxy({} as PrismaClient, outerProxyHandler)