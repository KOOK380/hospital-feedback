import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// PUT /api/roles/[id] - Update role permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can edit role permissions
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { role: true },
    })

    if (!user || user.role.name !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only Super Admin can edit role permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { permissions, displayName, description } = body

    // Don't allow modifying SUPER_ADMIN's permissions (always 'all')
    const targetRole = await db.role.findUnique({ where: { id } })
    if (!targetRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (targetRole.name === 'SUPER_ADMIN') {
      // Only allow updating displayName/description, not permissions
      const updated = await db.role.update({
        where: { id },
        data: {
          ...(displayName ? { displayName } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      })
      return NextResponse.json({
        role: {
          id: updated.id,
          name: updated.name,
          displayName: updated.displayName,
          permissions: JSON.parse(updated.permissions),
          description: updated.description,
          isDefault: updated.isDefault,
        },
      })
    }

    if (permissions && !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 })
    }

    const updated = await db.role.update({
      where: { id },
      data: {
        ...(permissions ? { permissions: JSON.stringify(permissions) } : {}),
        ...(displayName ? { displayName } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'UPDATE',
        entityType: 'ROLE',
        entityId: id,
        details: JSON.stringify({
          roleName: targetRole.name,
          oldPermissions: JSON.parse(targetRole.permissions),
          newPermissions: permissions || JSON.parse(targetRole.permissions),
        }),
      },
    })

    return NextResponse.json({
      role: {
        id: updated.id,
        name: updated.name,
        displayName: updated.displayName,
        permissions: JSON.parse(updated.permissions),
        description: updated.description,
        isDefault: updated.isDefault,
      },
    })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
