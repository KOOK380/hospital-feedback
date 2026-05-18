'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  ClipboardList,
  MessageSquare,
  Star,
  Users,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Send,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { analyticsApi, surveysApi, smsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OverviewData {
  totalSurveys: number
  activeSurveys: number
  totalResponses: number
  completedResponses: number
  pendingResponses: number
  patientAvgRating: number
  employeeAvgRating: number
}

interface RatingDistribution {
  patient: Record<string, number>
  employee: Record<string, number>
}

interface DepartmentRating {
  departmentId: string
  departmentName: string
  departmentCode: string
  totalResponses: number
  patientAvgRating: number | null
  employeeAvgRating: number | null
  overallAvgRating: number
}

interface TrendData {
  date: string
  total: number
  patient: number
  employee: number
}

interface SmsStats {
  total: number
  sent: number
  delivered: number
  failed: number
}

interface DashboardData {
  overview: OverviewData
  ratingDistribution: RatingDistribution
  departmentRatings: DepartmentRating[]
  recentTrend: TrendData[]
  surveyTypeBreakdown: {
    patient: { surveyCount: number; responseCount: number }
    employee: { surveyCount: number; responseCount: number }
  }
  smsStats: SmsStats
}

// ─── Color constants ─────────────────────────────────────────────────────────

const TEAL = '#0D9488'
const TEAL_LIGHT = '#14B8A6'
const EMERALD = '#059669'
const AMBER = '#D97706'
const PURPLE = '#7C3AED'
const PURPLE_LIGHT = '#8B5CF6'
const RED = '#DC2626'
const ORANGE = '#EA580C'
const GREEN = '#16A34A'

// ─── Animation variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ─── Helper functions ────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function renderStars(rating: number, maxStars = 5): React.ReactNode {
  const stars = []
  for (let i = 1; i <= maxStars; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-4 w-4 ${
          i <= Math.round(rating)
            ? 'fill-amber-400 text-amber-400'
            : 'fill-muted text-muted-foreground/30'
        }`}
      />
    )
  }
  return <div className="flex items-center gap-0.5">{stars}</div>
}

function getRatingColor(rating: number): string {
  if (rating < 2.5) return RED
  if (rating <= 3.5) return ORANGE
  return GREEN
}

function getRatingBgClass(rating: number): string {
  if (rating < 2.5) return 'bg-red-500'
  if (rating <= 3.5) return 'bg-orange-500'
  return 'bg-emerald-500'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Skeleton loaders ────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

function RatingTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label} Star</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value} responses
        </p>
      ))}
    </div>
  )
}

// ─── Main Dashboard Component ────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentResponses, setRecentResponses] = useState<any[]>([])
  const [recentSms, setRecentSms] = useState<any[]>([])
  const user = useAuthStore((s) => s.user)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await analyticsApi.dashboard()
      setData(result as DashboardData)

      // Fetch recent survey responses
      try {
        const surveysResult = await surveysApi.list()
        const surveys = surveysResult.surveys || []
        if (surveys.length > 0) {
          const respResult = await surveysApi.responses(surveys[0].id, 1, 5)
          setRecentResponses(respResult.responses || [])
        }
      } catch {
        // Non-critical: don't block dashboard on this
      }

      // Fetch recent SMS
      try {
        const smsResult = await smsApi.logs({ page: 1, limit: 5 })
        setRecentSms(smsResult.logs || [])
      } catch {
        // Non-critical
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <StatsSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  // ─── Error state ──────────────────────────────────────────────────────────

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Failed to Load Dashboard</h3>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchDashboard} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { overview, ratingDistribution, departmentRatings, recentTrend, smsStats } = data

  // ─── Prepare chart data ───────────────────────────────────────────────────

  const patientDistData = [1, 2, 3, 4, 5].map((star) => ({
    star: `${star}`,
    responses: ratingDistribution.patient[String(star)] || 0,
  }))

  const employeeDistData = [1, 2, 3, 4, 5].map((star) => ({
    star: `${star}`,
    responses: ratingDistribution.employee[String(star)] || 0,
  }))

  const trendChartData = recentTrend.map((item) => ({
    date: formatDate(item.date),
    patient: item.patient,
    employee: item.employee,
  }))

  const smsPieData = [
    { name: 'Delivered', value: smsStats.delivered, color: EMERALD },
    { name: 'Sent', value: smsStats.sent, color: TEAL },
    { name: 'Failed', value: smsStats.failed, color: RED },
  ].filter((d) => d.value > 0)

  const deliveryRate = smsStats.total > 0
    ? Math.round(((smsStats.delivered + smsStats.sent) / smsStats.total) * 100)
    : 0

  const sortedDepts = [...departmentRatings].sort((a, b) => b.overallAvgRating - a.overallAvgRating)

  // ─── Percentage change mock (since we don't have previous period data) ────

  const statsCards = [
    {
      title: 'Total Surveys',
      value: formatNumber(overview.totalSurveys),
      sub: `${overview.activeSurveys} active`,
      icon: ClipboardList,
      gradient: 'from-teal-500/10 to-teal-600/5',
      iconBg: 'bg-teal-500/15',
      iconColor: 'text-teal-600',
      change: overview.activeSurveys > 0,
      changeLabel: 'active now',
    },
    {
      title: 'Total Responses',
      value: formatNumber(overview.totalResponses),
      sub: `${formatNumber(overview.completedResponses)} completed`,
      icon: MessageSquare,
      gradient: 'from-emerald-500/10 to-emerald-600/5',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      change: overview.completedResponses > 0,
      changeLabel: 'completion rate',
    },
    {
      title: 'Avg Patient Rating',
      value: overview.patientAvgRating.toFixed(1),
      sub: renderStars(overview.patientAvgRating),
      icon: Star,
      gradient: 'from-amber-500/10 to-amber-600/5',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600',
      change: overview.patientAvgRating >= 3.5,
      changeLabel: overview.patientAvgRating >= 3.5 ? 'above average' : 'needs attention',
    },
    {
      title: 'Avg Employee Rating',
      value: overview.employeeAvgRating.toFixed(1),
      sub: renderStars(overview.employeeAvgRating),
      icon: Users,
      gradient: 'from-purple-500/10 to-purple-600/5',
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-600',
      change: overview.employeeAvgRating >= 3.5,
      changeLabel: overview.employeeAvgRating >= 3.5 ? 'above average' : 'needs attention',
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Hospital satisfaction survey analytics overview
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          disabled={loading}
          className="gap-2 self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ─── 1. Top Stats Cards ──────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {statsCards.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className={`overflow-hidden rounded-xl border-0 bg-gradient-to-br ${stat.gradient} shadow-sm backdrop-blur`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                    <div className="flex items-center gap-1.5">
                      {stat.change ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-orange-500" />
                      )}
                      <span className="text-xs text-muted-foreground">{stat.changeLabel}</span>
                    </div>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
                {typeof stat.sub === 'string' && (
                  <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>
                )}
                {typeof stat.sub !== 'string' && (
                  <div className="mt-2">{stat.sub}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── 2. Patient vs Employee Rating Distribution ───────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                  <Star className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Patient Satisfaction</CardTitle>
                  <CardDescription>Star rating distribution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={patientDistData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="star"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Star Rating', position: 'insideBottom', offset: -5, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<RatingTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="responses" name="Patient" radius={[6, 6, 0, 0]}>
                    {patientDistData.map((_, index) => (
                      <Cell key={`cell-p-${index}`} fill={index >= 3 ? TEAL : TEAL_LIGHT} fillOpacity={index >= 3 ? 1 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Employee Satisfaction</CardTitle>
                  <CardDescription>Star rating distribution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={employeeDistData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="star"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Star Rating', position: 'insideBottom', offset: -5, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<RatingTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="responses" name="Employee" radius={[6, 6, 0, 0]}>
                    {employeeDistData.map((_, index) => (
                      <Cell key={`cell-e-${index}`} fill={index >= 3 ? PURPLE : PURPLE_LIGHT} fillOpacity={index >= 3 ? 1 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── 3. Department-wise Ratings ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Department Ratings</CardTitle>
                <CardDescription>Average satisfaction ratings by department</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sortedDepts.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No department data available
              </div>
            ) : (
              <div className="max-h-96 space-y-3 overflow-y-auto pr-2 scrollbar-thin">
                {sortedDepts.map((dept) => (
                  <div
                    key={dept.departmentId}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-sm">{dept.departmentName}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {dept.totalResponses} resp.
                          </Badge>
                        </div>
                        <span className="ml-2 text-sm font-bold" style={{ color: getRatingColor(dept.overallAvgRating) }}>
                          {dept.overallAvgRating.toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress
                          value={(dept.overallAvgRating / 5) * 100}
                          className={`h-2 flex-1 ${getRatingBgClass(dept.overallAvgRating)}`}
                        />
                        <div className="flex shrink-0 gap-2 text-xs text-muted-foreground">
                          {dept.patientAvgRating !== null && (
                            <span className="flex items-center gap-0.5">
                              <span className="inline-block h-2 w-2 rounded-full bg-teal-500" />
                              P: {dept.patientAvgRating.toFixed(1)}
                            </span>
                          )}
                          {dept.employeeAvgRating !== null && (
                            <span className="flex items-center gap-0.5">
                              <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
                              E: {dept.employeeAvgRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 4. Response Trend ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                <TrendingUp className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base">Response Trend</CardTitle>
                <CardDescription>Daily survey submissions over the last 7 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="employeeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PURPLE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs font-medium">{value === 'patient' ? 'Patient' : 'Employee'}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="patient"
                  name="patient"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill="url(#patientGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="employee"
                  name="employee"
                  stroke={PURPLE}
                  strokeWidth={2}
                  fill="url(#employeeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 5 & 6. SMS Stats + Recent Activity ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* SMS Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Send className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">SMS Delivery</CardTitle>
                  <CardDescription>SMS notification delivery status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                {/* Donut Chart */}
                <div className="relative shrink-0">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={smsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {smsPieData.map((entry, index) => (
                          <Cell key={`cell-sms-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{deliveryRate}%</span>
                    <span className="text-[10px] text-muted-foreground">Delivery</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 w-full">
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                    <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
                    <p className="text-lg font-bold">{formatNumber(smsStats.delivered)}</p>
                    <p className="text-[10px] text-muted-foreground">Delivered</p>
                  </div>
                  <div className="rounded-lg bg-teal-500/10 p-3 text-center">
                    <Send className="mx-auto mb-1 h-5 w-5 text-teal-500" />
                    <p className="text-lg font-bold">{formatNumber(smsStats.sent)}</p>
                    <p className="text-[10px] text-muted-foreground">Sent</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3 text-center">
                    <XCircle className="mx-auto mb-1 h-5 w-5 text-red-500" />
                    <p className="text-lg font-bold">{formatNumber(smsStats.failed)}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                </div>
              </div>

              {/* Total bar */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs text-muted-foreground shrink-0">Total Sent:</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
                  {smsStats.total > 0 && (
                    <>
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(smsStats.delivered / smsStats.total) * 100}%` }}
                      />
                      <div
                        className="bg-teal-500 h-full transition-all"
                        style={{ width: `${(smsStats.sent / smsStats.total) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 h-full transition-all"
                        style={{ width: `${(smsStats.failed / smsStats.total) * 100}%` }}
                      />
                    </>
                  )}
                </div>
                <span className="text-xs font-semibold shrink-0">{formatNumber(smsStats.total)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                  <Activity className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest survey submissions & SMS notifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                {/* Recent Survey Responses */}
                {recentResponses.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Survey Responses
                    </p>
                    {recentResponses.map((resp: any, idx: number) => (
                      <div
                        key={resp.id || idx}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/15">
                          <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {resp.respondentName || resp.patientName || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rating: {resp.overallRating ? `${resp.overallRating}/5` : 'N/A'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-muted-foreground">
                            {resp.submittedAt
                              ? timeAgo(new Date(resp.submittedAt))
                              : 'Recently'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent SMS */}
                {recentSms.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      SMS Notifications
                    </p>
                    {recentSms.map((log: any, idx: number) => (
                      <div
                        key={log.id || idx}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          log.status === 'DELIVERED'
                            ? 'bg-emerald-500/15'
                            : log.status === 'FAILED'
                            ? 'bg-red-500/15'
                            : 'bg-teal-500/15'
                        }`}>
                          {log.status === 'DELIVERED' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : log.status === 'FAILED' ? (
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                          ) : (
                            <Send className="h-3.5 w-3.5 text-teal-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.recipientPhone || log.recipient || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.message || log.content || 'SMS sent'}</p>
                        </div>
                        <Badge
                          variant={
                            log.status === 'DELIVERED'
                              ? 'default'
                              : log.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="shrink-0 text-[10px]"
                        >
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {recentResponses.length === 0 && recentSms.length === 0 && (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Utility: time ago ───────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
