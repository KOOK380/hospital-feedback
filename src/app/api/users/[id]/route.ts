import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const user = await db.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        role: { select: { id: true, name: true, displayName: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { password, ...sanitized } = user
    return NextResponse.json({ user: sanitized })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, phone, roleId, departmentId, isActive, password } = body

    const existing = await db.user.findUnique({ where: { id, deletedAt: null } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (roleId !== undefined) updateData.roleId = roleId
    if (departmentId !== undefined) updateData.departmentId = departmentId
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) updateData.password = await bcrypt.hash(password, 10)

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, name: true, displayName: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify(updateData),
      },
    })

    const { password: _, ...sanitized } = user
    return NextResponse.json({ user: sanitized })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await db.user.findUnique({ where: { id, deletedAt: null } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await db.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'DELETE',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify({ softDelete: true }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
