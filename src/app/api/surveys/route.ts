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
    const departmentId = searchParams.get('departmentId')
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = { deletedAt: null }
    if (type) where.type = type
    if (departmentId) where.departmentId = departmentId
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true'

    const surveys = await db.survey.findMany({
      where,
      include: {
        _count: { select: { questions: true, responses: true } },
        creator: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(surveys)
  } catch (error) {
    console.error('List surveys error:', error)
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
    const { title, description, type, isActive, isAnonymous, startDate, endDate, departmentId, questions } = body

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
        { status: 400 }
      )
    }

    if (!['PATIENT', 'EMPLOYEE'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be PATIENT or EMPLOYEE' },
        { status: 400 }
      )
    }

    const survey = await db.survey.create({
      data: {
        title,
        description,
        type,
        isActive: isActive ?? true,
        isAnonymous: isAnonymous ?? false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: authUser.id,
        departmentId,
        questions: questions
          ? {
              create: questions.map((q: { questionText: string; questionType: string; options?: string; category?: string; order?: number; isRequired?: boolean }) => ({
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options || '[]',
                category: q.category,
                order: q.order ?? 0,
                isRequired: q.isRequired ?? true,
              })),
            }
          : undefined,
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
        creator: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'CREATE',
        entityType: 'SURVEY',
        entityId: survey.id,
        details: JSON.stringify({ title, type, questionCount: questions?.length || 0 }),
      },
    })

    return NextResponse.json(survey, { status: 201 })
  } catch (error) {
    console.error('Create survey error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
