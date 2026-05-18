import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'hospital-survey-secret-key-2024'

export interface AuthUser {
  id: string
  email: string
  name: string
  roleId: string
}

export function verifyToken(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.substring(7)
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * Check if a user has a specific permission.
 * SUPER_ADMIN with 'all' permission always returns true.
 * RESPONDENT role (no admin access) always returns false for any permission.
 */
export async function hasPermission(authUser: AuthUser, permission: string): Promise<boolean> {
  try {
    const role = await db.role.findUnique({
      where: { id: authUser.roleId },
    })
    if (!role) return false

    const permissions: string[] = JSON.parse(role.permissions)

    // SUPER_ADMIN has all permissions
    if (permissions.includes('all')) return true

    // Check for the specific permission
    return permissions.includes(permission)
  } catch {
    return false
  }
}

/**
 * Verify that the authenticated user has a specific permission.
 * Returns the auth user if authorized, or null if not.
 * Use this in API routes to enforce permission checks.
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ authUser: AuthUser; authorized: boolean }> {
  const authUser = verifyToken(request)
  if (!authUser) return { authUser: authUser!, authorized: false }

  const authorized = await hasPermission(authUser, permission)
  return { authUser, authorized }
}
