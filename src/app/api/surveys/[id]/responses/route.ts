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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { surveyId: id }
    if (status) where.status = status

    const [responses, total] = await Promise.all([
      db.surveyResponse.findMany({
        where,
        include: {
          answers: {
            include: {
              question: { select: { id: true, questionText: true, questionType: true, category: true } },
            },
          },
          respondent: { select: { id: true, name: true, email: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.surveyResponse.count({ where }),
    ])

    return NextResponse.json({
      data: responses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get survey responses error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify survey exists
    const survey = await db.survey.findUnique({
      where: { id, deletedAt: null },
      include: { questions: true },
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    if (!survey.isActive) {
      return NextResponse.json({ error: 'Survey is not active' }, { status: 400 })
    }

    const body = await request.json()
    const { respondentId, departmentId, isAnonymous, answers, overallRating } = body

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: 'Answers array is required' },
        { status: 400 }
      )
    }

    // For non-anonymous surveys, verify authentication
    let authUser = null
    if (!survey.isAnonymous) {
      authUser = verifyToken(request)
      if (!authUser) {
        return NextResponse.json(
          { error: 'Authentication required for this survey' },
          { status: 401 }
        )
      }
    }

    // Use authenticated user's ID and department for non-anonymous surveys
    const finalRespondentId = survey.isAnonymous ? null : (authUser?.id || respondentId || null)
    const finalIsAnonymous = survey.isAnonymous

    // For non-anonymous surveys with authenticated user, auto-fill department from their profile
    let finalDepartmentId = departmentId
    if (!survey.isAnonymous && authUser) {
      const userWithDept = await db.user.findUnique({
        where: { id: authUser.id },
        select: { departmentId: true },
      })
      if (userWithDept?.departmentId && !departmentId) {
        finalDepartmentId = userWithDept.departmentId
      }
    }

    const response = await db.surveyResponse.create({
      data: {
        surveyId: id,
        respondentId: finalRespondentId,
        departmentId: finalDepartmentId,
        status: 'COMPLETED',
        isAnonymous: finalIsAnonymous,
        overallRating,
        answers: {
          create: answers.map((a: { questionId: string; answerText?: string; answerNumber?: number; answerChoice?: string }) => ({
            questionId: a.questionId,
            answerText: a.answerText || null,
            answerNumber: a.answerNumber || null,
            answerChoice: a.answerChoice || null,
          })),
        },
      },
      include: {
        answers: {
          include: {
            question: { select: { id: true, questionText: true, questionType: true } },
          },
        },
      },
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Submit survey response error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
