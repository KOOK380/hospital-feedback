import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public endpoint - no auth required
// Returns active survey details for public survey taking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 })
    }

    const survey = await db.survey.findUnique({
      where: { id, deletedAt: null, isActive: true },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            questionText: true,
            questionType: true,
            options: true,
            order: true,
            isRequired: true,
            category: true,
          },
        },
        department: { select: { id: true, name: true, code: true } },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found or inactive' }, { status: 404 })
    }

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Get public survey error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
