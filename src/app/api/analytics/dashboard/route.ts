import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Total surveys & active surveys
    const [totalSurveys, activeSurveys] = await Promise.all([
      db.survey.count({ where: { deletedAt: null } }),
      db.survey.count({ where: { deletedAt: null, isActive: true } }),
    ])

    // Total responses & completed
    const [totalResponses, completedResponses] = await Promise.all([
      db.surveyResponse.count(),
      db.surveyResponse.count({ where: { status: 'COMPLETED' } }),
    ])

    // Average ratings using aggregation
    const patientRatingAgg = await db.surveyResponse.aggregate({
      where: { survey: { type: 'PATIENT' }, overallRating: { not: null } },
      _avg: { overallRating: true },
      _count: true,
    })

    const employeeRatingAgg = await db.surveyResponse.aggregate({
      where: { survey: { type: 'EMPLOYEE' }, overallRating: { not: null } },
      _avg: { overallRating: true },
      _count: true,
    })

    const patientAvgRating = patientRatingAgg._avg.overallRating ?? 0
    const employeeAvgRating = employeeRatingAgg._avg.overallRating ?? 0

    // Star rating distribution using raw SQL for efficiency
    // Group by answerNumber (rounded) and survey type
    const patientStarDist = await db.$queryRaw<Array<{ rating: number; count: bigint }>>`
      SELECT ROUND(sa.answerNumber) as rating, COUNT(*) as count
      FROM survey_answers sa
      JOIN survey_questions sq ON sa.questionId = sq.id
      JOIN surveys s ON sq.surveyId = s.id
      WHERE sq.questionType = 'STAR_RATING'
        AND s.type = 'PATIENT'
        AND sa.answerNumber IS NOT NULL
        AND ROUND(sa.answerNumber) BETWEEN 1 AND 5
      GROUP BY ROUND(sa.answerNumber)
      ORDER BY rating
    `

    const employeeStarDist = await db.$queryRaw<Array<{ rating: number; count: bigint }>>`
      SELECT ROUND(sa.answerNumber) as rating, COUNT(*) as count
      FROM survey_answers sa
      JOIN survey_questions sq ON sa.questionId = sq.id
      JOIN surveys s ON sq.surveyId = s.id
      WHERE sq.questionType = 'STAR_RATING'
        AND s.type = 'EMPLOYEE'
        AND sa.answerNumber IS NOT NULL
        AND ROUND(sa.answerNumber) BETWEEN 1 AND 5
      GROUP BY ROUND(sa.answerNumber)
      ORDER BY rating
    `

    const buildDistFromRaw = (raw: Array<{ rating: number; count: bigint }>) => {
      const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      for (const row of raw) {
        dist[String(row.rating)] = Number(row.count)
      }
      return dist
    }

    const patientRatingDistribution = buildDistFromRaw(patientStarDist)
    const employeeRatingDistribution = buildDistFromRaw(employeeStarDist)

    // Department-wise average ratings using raw SQL
    const deptRatings = await db.$queryRaw<Array<{
      departmentId: string
      departmentName: string
      departmentCode: string
      totalResponses: bigint
      patientAvg: number | null
      employeeAvg: number | null
      overallAvg: number
    }>>`
      SELECT
        d.id as departmentId,
        d.name as departmentName,
        d.code as departmentCode,
        COUNT(sr.id) as totalResponses,
        AVG(CASE WHEN s.type = 'PATIENT' THEN sr.overallRating END) as patientAvg,
        AVG(CASE WHEN s.type = 'EMPLOYEE' THEN sr.overallRating END) as employeeAvg,
        AVG(sr.overallRating) as overallAvg
      FROM departments d
      JOIN survey_responses sr ON sr.departmentId = d.id
      JOIN surveys s ON sr.surveyId = s.id
      WHERE d.isActive = 1 AND sr.overallRating IS NOT NULL
      GROUP BY d.id, d.name, d.code
      ORDER BY overallAvg DESC
    `

    const departmentRatings = deptRatings.map(dr => ({
      departmentId: dr.departmentId,
      departmentName: dr.departmentName,
      departmentCode: dr.departmentCode,
      totalResponses: Number(dr.totalResponses),
      patientAvgRating: dr.patientAvg !== null ? Math.round(dr.patientAvg * 100) / 100 : null,
      employeeAvgRating: dr.employeeAvg !== null ? Math.round(dr.employeeAvg * 100) / 100 : null,
      overallAvgRating: Math.round(dr.overallAvg * 100) / 100,
    }))

    // Recent responses trend (last 7 days) using raw SQL
    const trendRaw = await db.$queryRaw<Array<{
      date: string
      total: bigint
      patient: bigint
      employee: bigint
    }>>`
      SELECT
        DATE(sr.submittedAt) as date,
        COUNT(*) as total,
        SUM(CASE WHEN s.type = 'PATIENT' THEN 1 ELSE 0 END) as patient,
        SUM(CASE WHEN s.type = 'EMPLOYEE' THEN 1 ELSE 0 END) as employee
      FROM survey_responses sr
      JOIN surveys s ON sr.surveyId = s.id
      WHERE sr.submittedAt >= DATE('now', '-7 days')
      GROUP BY DATE(sr.submittedAt)
      ORDER BY date
    `

    // Fill in missing days
    const trendMap = new Map(trendRaw.map(t => [t.date, t]))
    const recentTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const existing = trendMap.get(dateStr)
      recentTrend.push({
        date: dateStr,
        total: existing ? Number(existing.total) : 0,
        patient: existing ? Number(existing.patient) : 0,
        employee: existing ? Number(existing.employee) : 0,
      })
    }

    // Survey type breakdown
    const [patientSurveyCount, employeeSurveyCount] = await Promise.all([
      db.survey.count({ where: { type: 'PATIENT', deletedAt: null } }),
      db.survey.count({ where: { type: 'EMPLOYEE', deletedAt: null } }),
    ])

    const [patientResponseCount, employeeResponseCount] = await Promise.all([
      db.surveyResponse.count({ where: { survey: { type: 'PATIENT' } } }),
      db.surveyResponse.count({ where: { survey: { type: 'EMPLOYEE' } } }),
    ])

    // SMS stats
    const [totalSms, sentSms, deliveredSms, failedSms] = await Promise.all([
      db.smsLog.count(),
      db.smsLog.count({ where: { status: 'SENT' } }),
      db.smsLog.count({ where: { status: 'DELIVERED' } }),
      db.smsLog.count({ where: { status: 'FAILED' } }),
    ])

    return NextResponse.json({
      overview: {
        totalSurveys,
        activeSurveys,
        totalResponses,
        completedResponses,
        pendingResponses: totalResponses - completedResponses,
        patientAvgRating: Math.round(patientAvgRating * 100) / 100,
        employeeAvgRating: Math.round(employeeAvgRating * 100) / 100,
      },
      ratingDistribution: {
        patient: patientRatingDistribution,
        employee: employeeRatingDistribution,
      },
      departmentRatings,
      recentTrend,
      surveyTypeBreakdown: {
        patient: { surveyCount: patientSurveyCount, responseCount: patientResponseCount },
        employee: { surveyCount: employeeSurveyCount, responseCount: employeeResponseCount },
      },
      smsStats: {
        total: totalSms,
        sent: sentSms,
        delivered: deliveredSms,
        failed: failedSms,
      },
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
