import { NextRequest, NextResponse } from 'next/server'
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
    const survey = await db.survey.findUnique({
      where: { id, deletedAt: null },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
        creator: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Get survey error:', error)
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
    const { title, description, type, isActive, isAnonymous, startDate, endDate, departmentId, questions } = body

    const existing = await db.survey.findUnique({ where: { id, deletedAt: null } })
    if (!existing) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (isActive !== undefined) updateData.isActive = isActive
    if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (departmentId !== undefined) updateData.departmentId = departmentId

    // If questions are provided, delete old and create new
    if (questions) {
      // First delete answers that reference the old questions, then delete questions
      const oldQuestionIds = await db.surveyQuestion.findMany({
        where: { surveyId: id },
        select: { id: true },
      })
      const qIds = oldQuestionIds.map((q) => q.id)
      if (qIds.length > 0) {
        await db.surveyAnswer.deleteMany({ where: { questionId: { in: qIds } } })
      }
      await db.surveyQuestion.deleteMany({ where: { surveyId: id } })
      updateData.questions = {
        create: questions.map((q: { questionText: string; questionType: string; options?: string; category?: string; order?: number; isRequired?: boolean }) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || '[]',
          category: q.category,
          order: q.order ?? 0,
          isRequired: q.isRequired ?? true,
        })),
      }
    }

    const survey = await db.survey.update({
      where: { id },
      data: updateData,
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
        action: 'UPDATE',
        entityType: 'SURVEY',
        entityId: id,
        details: JSON.stringify({ title, questionCount: questions?.length }),
      },
    })

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Update survey error:', error)
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
    const existing = await db.survey.findUnique({ where: { id, deletedAt: null } })
    if (!existing) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    await db.survey.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'DELETE',
        entityType: 'SURVEY',
        entityId: id,
        details: JSON.stringify({ softDelete: true }),
      },
    })

    return NextResponse.json({ message: 'Survey deleted successfully' })
  } catch (error) {
    console.error('Delete survey error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
