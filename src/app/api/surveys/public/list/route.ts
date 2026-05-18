import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public endpoint - no auth required
// Returns list of active surveys for respondent dashboard
export async function GET() {
  try {
    const surveys = await db.survey.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        isAnonymous: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ surveys })
  } catch (error) {
    console.error('List public surveys error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
