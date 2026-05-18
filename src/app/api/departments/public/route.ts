import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public endpoint - no auth required
// Returns active departments for survey form dropdown
export async function GET() {
  try {
    const departments = await db.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error('Get public departments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
