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
    const { name, content, variables, type, category, isActive, surveyId } = body

    const existing = await db.smsTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (content !== undefined) updateData.content = content
    if (variables !== undefined) updateData.variables = variables
    if (type !== undefined) updateData.type = type
    if (category !== undefined) updateData.category = category
    if (isActive !== undefined) updateData.isActive = isActive
    if (surveyId !== undefined) updateData.surveyId = surveyId

    const template = await db.smsTemplate.update({
      where: { id },
      data: updateData,
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'UPDATE',
        entityType: 'SMS',
        entityId: id,
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Update SMS template error:', error)
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
    const existing = await db.smsTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    await db.smsTemplate.delete({ where: { id } })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'DELETE',
        entityType: 'SMS',
        entityId: id,
        details: JSON.stringify({ name: existing.name }),
      },
    })

    return NextResponse.json({ message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Delete SMS template error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
