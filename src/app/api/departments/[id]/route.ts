import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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
    const { name, code, description, headId, isActive } = body

    const existing = await db.department.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (description !== undefined) updateData.description = description
    if (headId !== undefined) updateData.headId = headId
    if (isActive !== undefined) updateData.isActive = isActive

    const department = await db.department.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { users: true, surveys: true } },
        head: { select: { id: true, name: true, email: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'UPDATE',
        entityType: 'DEPARTMENT',
        entityId: id,
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ department })
  } catch (error) {
    console.error('Update department error:', error)
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
    const existing = await db.department.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    await db.department.update({
      where: { id },
      data: { isActive: false },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'DELETE',
        entityType: 'DEPARTMENT',
        entityId: id,
        details: JSON.stringify({ softDelete: true }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete department error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
