import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run independent queries in parallel for speed
    const [
      totalSurveys,
      activeSurveys,
      totalResponses,
      completedResponses,
      patientRatingAgg,
      employeeRatingAgg,
      patientSurveyCount,
      employeeSurveyCount,
      patientResponseCount,
      employeeResponseCount,
      totalSms,
      sentSms,
      deliveredSms,
      failedSms,
    ] = await Promise.all([
      db.survey.count({ where: { deletedAt: null } }),
      db.survey.count({ where: { deletedAt: null, isActive: true } }),
      db.surveyResponse.count(),
      db.surveyResponse.count({ where: { status: 'COMPLETED' } }),
      db.surveyResponse.aggregate({
        where: { survey: { type: 'PATIENT' }, overallRating: { not: null } },
        _avg: { overallRating: true },
        _count: true,
      }),
      db.surveyResponse.aggregate({
        where: { survey: { type: 'EMPLOYEE' }, overallRating: { not: null } },
        _avg: { overallRating: true },
        _count: true,
      }),
      db.survey.count({ where: { type: 'PATIENT', deletedAt: null } }),
      db.survey.count({ where: { type: 'EMPLOYEE', deletedAt: null } }),
      db.surveyResponse.count({ where: { survey: { type: 'PATIENT' } } }),
      db.surveyResponse.count({ where: { survey: { type: 'EMPLOYEE' } } }),
      db.smsLog.count(),
      db.smsLog.count({ where: { status: 'SENT' } }),
      db.smsLog.count({ where: { status: 'DELIVERED' } }),
      db.smsLog.count({ where: { status: 'FAILED' } }),
    ])

    const patientAvgRating = patientRatingAgg._avg.overallRating ?? 0
    const employeeAvgRating = employeeRatingAgg._avg.overallRating ?? 0

    // Date range for recent trend
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Fetch data for charts — all in parallel
    const [patientStarAnswers, employeeStarAnswers, deptResponses, recentResponses, allDepartments] =
      await Promise.all([
        // Patient star ratings
        db.surveyAnswer.findMany({
          where: {
            question: { questionType: 'STAR_RATING', survey: { type: 'PATIENT' } },
            answerNumber: { not: null },
          },
          select: { answerNumber: true },
        }),
        // Employee star ratings
        db.surveyAnswer.findMany({
          where: {
            question: { questionType: 'STAR_RATING', survey: { type: 'EMPLOYEE' } },
            answerNumber: { not: null },
          },
          select: { answerNumber: true },
        }),
        // Department responses — fetch with departmentId and survey type
        db.surveyResponse.findMany({
          where: { overallRating: { not: null }, departmentId: { not: null } },
          select: {
            overallRating: true,
            departmentId: true,
            survey: { select: { type: true } },
          },
        }),
        // Recent responses (last 7 days)
        db.surveyResponse.findMany({
          where: { submittedAt: { gte: sevenDaysAgo } },
          select: {
            submittedAt: true,
            survey: { select: { type: true } },
          },
        }),
        // All active departments for mapping
        db.department.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true },
        }),
      ])

    // Build department lookup map
    const deptLookup = new Map(allDepartments.map(d => [d.id, d]))

    // Build star rating distributions
    const buildDist = (answers: { answerNumber: number | null }[]) => {
      const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      for (const a of answers) {
        const rating = Math.round(a.answerNumber || 0)
        if (rating >= 1 && rating <= 5) {
          dist[String(rating)]++
        }
      }
      return dist
    }

    const patientRatingDistribution = buildDist(patientStarAnswers)
    const employeeRatingDistribution = buildDist(employeeStarAnswers)

    // Build department ratings — group by departmentId in JS
    const deptMap = new Map<string, {
      name: string
      code: string
      totalResponses: number
      patientRatings: number[]
      employeeRatings: number[]
    }>()

    for (const r of deptResponses) {
      if (!r.departmentId) continue
      const dept = deptLookup.get(r.departmentId)
      if (!dept) continue

      if (!deptMap.has(dept.id)) {
        deptMap.set(dept.id, {
          name: dept.name,
          code: dept.code,
          totalResponses: 0,
          patientRatings: [],
          employeeRatings: [],
        })
      }

      const d = deptMap.get(dept.id)!
      d.totalResponses++
      if (r.survey.type === 'PATIENT') {
        d.patientRatings.push(r.overallRating!)
      } else {
        d.employeeRatings.push(r.overallRating!)
      }
    }

    const departmentRatings = Array.from(deptMap.entries()).map(([id, d]) => {
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      return {
        departmentId: id,
        departmentName: d.name,
        departmentCode: d.code,
        totalResponses: d.totalResponses,
        patientAvgRating: d.patientRatings.length > 0 ? Math.round(avg(d.patientRatings) * 100) / 100 : null,
        employeeAvgRating: d.employeeRatings.length > 0 ? Math.round(avg(d.employeeRatings) * 100) / 100 : null,
        overallAvgRating: Math.round(avg([...d.patientRatings, ...d.employeeRatings]) * 100) / 100,
      }
    }).sort((a, b) => b.overallAvgRating - a.overallAvgRating)

    // Build recent trend (last 7 days)
    const trendMap = new Map<string, { total: number; patient: number; employee: number }>()
    for (const r of recentResponses) {
      const dateStr = r.submittedAt.toISOString().split('T')[0]
      if (!trendMap.has(dateStr)) {
        trendMap.set(dateStr, { total: 0, patient: 0, employee: 0 })
      }
      const t = trendMap.get(dateStr)!
      t.total++
      if (r.survey.type === 'PATIENT') t.patient++
      else t.employee++
    }

    // Fill in missing days
    const recentTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const existing = trendMap.get(dateStr)
      recentTrend.push({
        date: dateStr,
        total: existing ? existing.total : 0,
        patient: existing ? existing.patient : 0,
        employee: existing ? existing.employee : 0,
      })
    }

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
