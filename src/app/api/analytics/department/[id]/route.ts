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

    const department = await db.department.findUnique({
      where: { id },
      select: { id: true, name: true, code: true },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Department responses
    const deptResponses = await db.surveyResponse.findMany({
      where: { departmentId: id, overallRating: { not: null } },
      select: { overallRating: true, survey: { select: { type: true } } },
    })

    const patientResp = deptResponses.filter(r => r.survey.type === 'PATIENT')
    const employeeResp = deptResponses.filter(r => r.survey.type === 'EMPLOYEE')

    const patientAvg = patientResp.length > 0
      ? patientResp.reduce((sum, r) => sum + (r.overallRating || 0), 0) / patientResp.length
      : 0
    const employeeAvg = employeeResp.length > 0
      ? employeeResp.reduce((sum, r) => sum + (r.overallRating || 0), 0) / employeeResp.length
      : 0
    const overallAvg = deptResponses.length > 0
      ? deptResponses.reduce((sum, r) => sum + (r.overallRating || 0), 0) / deptResponses.length
      : 0

    // Star rating distribution for department
    const starAnswers = await db.surveyAnswer.findMany({
      where: {
        question: { questionType: 'STAR_RATING' },
        response: { departmentId: id },
        answerNumber: { not: null },
      },
      select: { answerNumber: true, question: { select: { category: true } } },
    })

    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const categoryRatings: Record<string, { total: number; count: number }> = {}

    for (const a of starAnswers) {
      const rating = Math.round(a.answerNumber || 0)
      if (rating >= 1 && rating <= 5) {
        ratingDist[rating]++
      }
      const cat = a.question.category || 'Uncategorized'
      if (!categoryRatings[cat]) categoryRatings[cat] = { total: 0, count: 0 }
      categoryRatings[cat].total += a.answerNumber || 0
      categoryRatings[cat].count++
    }

    const categoryAverages = Object.entries(categoryRatings).map(([category, data]) => ({
      category,
      averageRating: Math.round((data.total / data.count) * 100) / 100,
      responseCount: data.count,
    }))

    // Recent trend (last 7 days) for this department
    const trendData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayCount = await db.surveyResponse.count({
        where: { departmentId: id, submittedAt: { gte: date, lt: nextDate } },
      })

      trendData.push({
        date: date.toISOString().split('T')[0],
        responses: dayCount,
      })
    }

    // SMS stats for this department
    const [totalSms, sentSms, failedSms] = await Promise.all([
      db.smsLog.count({ where: { departmentId: id } }),
      db.smsLog.count({ where: { departmentId: id, status: { in: ['SENT', 'DELIVERED'] } } }),
      db.smsLog.count({ where: { departmentId: id, status: 'FAILED' } }),
    ])

    return NextResponse.json({
      department,
      overview: {
        totalResponses: deptResponses.length,
        patientResponses: patientResp.length,
        employeeResponses: employeeResp.length,
        patientAvgRating: Math.round(patientAvg * 100) / 100,
        employeeAvgRating: Math.round(employeeAvg * 100) / 100,
        overallAvgRating: Math.round(overallAvg * 100) / 100,
      },
      ratingDistribution: ratingDist,
      categoryAverages,
      recentTrend: trendData,
      smsStats: {
        total: totalSms,
        sent: sentSms,
        failed: failedSms,
      },
    })
  } catch (error) {
    console.error('Department analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
