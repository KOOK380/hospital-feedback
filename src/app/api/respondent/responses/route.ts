import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const responses = await db.surveyResponse.findMany({
      where: { respondentId: authUser.id },
      include: {
        survey: {
          select: { id: true, title: true, type: true }
        },
        answers: {
          include: {
            question: { select: { questionText: true, questionType: true } }
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    })

    // Compute stats
    const completedCount = responses.filter(r => r.status === 'COMPLETED').length
    const ratings = responses
      .filter(r => r.overallRating !== null && r.overallRating !== undefined)
      .map(r => r.overallRating as number)
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0
    const lastResponseDate = responses.length > 0
      ? responses[0].submittedAt
      : null

    return NextResponse.json({
      responses,
      stats: {
        completedCount,
        averageRating: Math.round(avgRating * 10) / 10,
        lastResponseDate,
      }
    })
  } catch (error) {
    console.error('Get respondent responses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
