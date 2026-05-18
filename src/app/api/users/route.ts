import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await db.user.findMany({
      where: { deletedAt: null },
      include: {
        role: { select: { id: true, name: true, displayName: true } },
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const sanitized = users.map(({ password, ...user }) => user)

    return NextResponse.json({ users: sanitized })
  } catch (error) {
    console.error('List users error:', error)
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
    const { email, name, password, phone, roleId, departmentId, isActive } = body

    if (!email || !name || !password || !roleId) {
      return NextResponse.json(
        { error: 'Email, name, password, and roleId are required' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        phone,
        roleId,
        departmentId,
        isActive: isActive ?? true,
        isVerified: false,
      },
      include: {
        role: { select: { id: true, name: true, displayName: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'CREATE',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ email, name, roleId }),
      },
    })

    const { password: _, ...sanitized } = user
    return NextResponse.json({ user: sanitized }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
