import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/roles - List all roles with permissions
export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN and IT_ADMIN can manage roles
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { role: true },
    })

    if (!user || (user.role.name !== 'SUPER_ADMIN' && user.role.name !== 'IT_ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const roles = await db.role.findMany({
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        permissions: JSON.parse(role.permissions),
        description: role.description,
        isDefault: role.isDefault,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get roles error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
