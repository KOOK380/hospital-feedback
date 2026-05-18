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
    const includeInactive = searchParams.get('all') === 'true'

    const departments = await db.department.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: { select: { users: true, surveys: true } },
        head: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error('List departments error:', error)
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
    const { name, code, description, headId } = body

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    const existing = await db.department.findFirst({
      where: { OR: [{ name }, { code }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Department name or code already exists' },
        { status: 400 }
      )
    }

    const department = await db.department.create({
      data: { name, code, description, headId },
      include: {
        _count: { select: { users: true, surveys: true } },
        head: { select: { id: true, name: true, email: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'CREATE',
        entityType: 'DEPARTMENT',
        entityId: department.id,
        details: JSON.stringify({ name, code }),
      },
    })

    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    console.error('Create department error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
