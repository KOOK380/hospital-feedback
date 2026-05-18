import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (category) where.category = category

    const templates = await db.smsTemplate.findMany({
      where,
      include: {
        _count: { select: { logs: true } },
        survey: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('List SMS templates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, content, variables, type, category, isActive, surveyId } = body

    if (!name || !content || !type) {
      return NextResponse.json(
        { error: 'Name, content, and type are required' },
        { status: 400 }
      )
    }

    const template = await db.smsTemplate.create({
      data: {
        name,
        content,
        variables: variables || '[]',
        type,
        category,
        isActive: isActive ?? true,
        surveyId,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'CREATE',
        entityType: 'SMS',
        entityId: template.id,
        details: JSON.stringify({ name, type }),
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Create SMS template error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
