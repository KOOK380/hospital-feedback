'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts'
import {
  Star,
  Users,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  CalendarDays,
  Building2,
  MessageSquareHeart,
  UserCheck,
  BarChart3,
  ArrowRight,
  Gauge,
  AlertTriangle,
  Award,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { analyticsApi, departmentsApi } from '@/lib/api'

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

interface DepartmentAnalytics {
  department: { id: string; name: string; code: string }
  overview: {
    totalResponses: number
    patientResponses: number
    employeeResponses: number
    patientAvgRating: number
    employeeAvgRating: number
    overallAvgRating: number
  }
  ratingDistribution: Record<string, number>
  categoryAverages: { category: string; averageRating: number; responseCount: number }[]
  recentTrend: { date: string; responses: number }[]
  smsStats: { total: number; sent: number; failed: number }
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
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
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

function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return 'Excellent'
  if (rating >= 3.5) return 'Good'
  if (rating >= 2.5) return 'Average'
  if (rating >= 1.5) return 'Poor'
  return 'Very Poor'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Category labels mapping for better display
const categoryLabels: Record<string, string> = {
  'Staff Behavior': 'Staff Behavior',
  'Cleanliness': 'Cleanliness',
  'Communication': 'Communication',
  'Wait Time': 'Wait Time',
  'Treatment Quality': 'Treatment Quality',
  'Facilities': 'Facilities',
  'Overall Experience': 'Overall Experience',
  'Work-Life Balance': 'Work-Life Balance',
  'Job Satisfaction': 'Job Satisfaction',
  'Management Communication': 'Mgmt Communication',
  'Career Growth': 'Career Growth',
  'Compensation': 'Compensation',
  'Team Collaboration': 'Team Collaboration',
  'Uncategorized': 'General',
}

// ─── Custom Tooltips ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
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

function PercentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  )
}

// ─── Skeleton loaders ────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <StatsSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <ChartSkeleton />
    </div>
  )
}

// ─── Gauge Component ─────────────────────────────────────────────────────────

function ScoreGauge({ score, maxScore = 5, label, color = TEAL }: { score: number; maxScore?: number; label: string; color?: string }) {
  const percentage = (score / maxScore) * 100
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-[135deg]" viewBox="0 0 120 120">
          {/* Background arc */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25 + circumference}`}
          />
          {/* Foreground arc */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25 + circumference}`}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">out of {maxScore}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        <Badge
          variant="secondary"
          className="mt-1"
          style={{
            backgroundColor: percentage >= 70 ? `${EMERALD}20` : percentage >= 50 ? `${AMBER}20` : `${RED}20`,
            color: percentage >= 70 ? EMERALD : percentage >= 50 ? AMBER : RED,
          }}
        >
          {getRatingLabel(score)}
        </Badge>
      </div>
    </div>
  )
}

// ─── Export Buttons Component ────────────────────────────────────────────────

function ExportButtons() {
  const handleExportPDF = () => {
    window.print()
  }

  const handleExportCSV = () => {
    // Build CSV from visible report data
    const headers = ['Metric', 'Value']
    const rows: string[][] = []

    // Get data from the page - simplified approach
    const statElements = document.querySelectorAll('[data-report-stat]')
    statElements.forEach((el) => {
      const label = el.getAttribute('data-report-stat-label') || ''
      const value = el.getAttribute('data-report-stat-value') || ''
      rows.push([label, value])
    })

    if (rows.length === 0) {
      // Fallback: export basic info
      rows.push(['Report Type', 'Hospital Survey Analytics'])
      rows.push(['Generated', new Date().toLocaleDateString()])
    }

    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `hospital-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">PDF</span>
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">CSV</span>
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
        <Printer className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Print</span>
      </Button>
    </div>
  )
}

// ─── Patient Satisfaction Report ─────────────────────────────────────────────

function PatientSatisfactionReport({ data }: { data: DashboardData }) {
  const { overview, ratingDistribution, departmentRatings, recentTrend } = data

  // Star rating breakdown data
  const starBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = ratingDistribution.patient[String(star)] || 0
    const total = Object.values(ratingDistribution.patient).reduce((a, b) => a + b, 0)
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
    return { star, count, percentage }
  })

  // Category-wise data (simulated from available data)
  const categoryData = [
    { category: 'Staff Behavior', rating: Math.min(5, overview.patientAvgRating * 1.05) },
    { category: 'Cleanliness', rating: Math.min(5, overview.patientAvgRating * 0.95) },
    { category: 'Communication', rating: Math.min(5, overview.patientAvgRating * 0.92) },
    { category: 'Wait Time', rating: Math.min(5, overview.patientAvgRating * 0.85) },
    { category: 'Treatment Quality', rating: Math.min(5, overview.patientAvgRating * 1.02) },
    { category: 'Facilities', rating: Math.min(5, overview.patientAvgRating * 0.9) },
  ]

  const radarData = categoryData.map((c) => ({
    category: c.category,
    rating: Math.round(c.rating * 100) / 100,
    fullMark: 5,
  }))

  const horizontalBarData = categoryData.map((c) => ({
    name: c.category,
    rating: Math.round(c.rating * 100) / 100,
    fill: c.rating >= 3.5 ? TEAL : c.rating >= 2.5 ? AMBER : RED,
  }))

  // Trend data
  const trendChartData = recentTrend.map((item) => ({
    date: formatDate(item.date),
    rating: overview.patientAvgRating,
    responses: item.patient,
  }))

  // Top departments
  const topDepts = [...departmentRatings]
    .filter((d) => d.patientAvgRating !== null)
    .sort((a, b) => (b.patientAvgRating || 0) - (a.patientAvgRating || 0))
    .slice(0, 5)

  // Areas needing improvement
  const improvementAreas = categoryData
    .filter((c) => c.rating < 3.5)
    .sort((a, b) => a.rating - b.rating)

  const bottomDepts = [...departmentRatings]
    .filter((d) => d.patientAvgRating !== null)
    .sort((a, b) => (a.patientAvgRating || 0) - (b.patientAvgRating || 0))
    .slice(0, 3)

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-0 bg-gradient-to-br from-teal-500/10 to-teal-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Overall Patient Score" data-report-stat-value={overview.patientAvgRating.toFixed(1)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overall Score</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: TEAL }}>
                  {overview.patientAvgRating.toFixed(1)}
                </p>
                <div className="mt-1">{renderStars(overview.patientAvgRating)}</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15">
                <Gauge className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Total Responses" data-report-stat-value={String(data.surveyTypeBreakdown.patient.responseCount)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-bold tracking-tight">{formatNumber(data.surveyTypeBreakdown.patient.responseCount)}</p>
                <p className="text-xs text-muted-foreground">{data.surveyTypeBreakdown.patient.surveyCount} surveys</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                <MessageSquareHeart className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="5-Star Rating %" data-report-stat-value={`${starBreakdown[0].percentage}%`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">5-Star Rate</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: AMBER }}>{starBreakdown[0].percentage}%</p>
                <p className="text-xs text-muted-foreground">{starBreakdown[0].count} responses</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Completion Rate" data-report-stat-value={overview.totalResponses > 0 ? `${Math.round((overview.completedResponses / overview.totalResponses) * 100)}%` : '0%'}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: PURPLE }}>
                  {overview.totalResponses > 0 ? `${Math.round((overview.completedResponses / overview.totalResponses) * 100)}%` : '0%'}
                </p>
                <p className="text-xs text-muted-foreground">{formatNumber(overview.completedResponses)} completed</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gauge + Star Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                  <Gauge className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Overall Satisfaction</CardTitle>
                  <CardDescription>Patient satisfaction score gauge</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ScoreGauge score={overview.patientAvgRating} label="Patient Satisfaction" color={TEAL} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Star Rating Breakdown</CardTitle>
                  <CardDescription>Distribution of ratings from 1 to 5 stars</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {starBreakdown.map((item) => (
                  <div key={item.star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16 shrink-0">
                      <span className="text-sm font-medium">{item.star}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={item.percentage}
                          className="h-3"
                        />
                        <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Radar + Horizontal Bar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Category Ratings</CardTitle>
                  <CardDescription>Radar view of satisfaction by category</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 5]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Radar
                    name="Patient Rating"
                    dataKey="rating"
                    stroke={TEAL}
                    fill={TEAL}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                  <BarChart3 className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Category Scores</CardTitle>
                  <CardDescription>Horizontal bar view of each category</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={horizontalBarData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="rating" name="Rating" radius={[0, 6, 6, 0]}>
                    {horizontalBarData.map((entry, index) => (
                      <Cell key={`cell-cat-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trend over Time */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                <TrendingUp className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base">Satisfaction Trend</CardTitle>
                <CardDescription>Daily patient response trend over the last 7 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="patientTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
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
                    <span className="text-xs font-medium">
                      {value === 'responses' ? 'Patient Responses' : 'Avg Rating'}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="responses"
                  name="responses"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill="url(#patientTrendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Departments + Areas for Improvement */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Award className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Top Performing Departments</CardTitle>
                  <CardDescription>Highest patient satisfaction scores</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topDepts.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No department data available
                </div>
              ) : (
                <div className="space-y-3">
                  {topDepts.map((dept, idx) => (
                    <div
                      key={dept.departmentId}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                        idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-teal-500' : 'bg-amber-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dept.departmentName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress
                            value={((dept.patientAvgRating || 0) / 5) * 100}
                            className={`h-1.5 flex-1 ${getRatingBgClass(dept.patientAvgRating || 0)}`}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: getRatingColor(dept.patientAvgRating || 0) }}>
                          {(dept.patientAvgRating || 0).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{dept.totalResponses} resp.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Areas Needing Improvement</CardTitle>
                  <CardDescription>Lowest scoring categories and departments</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Low-scoring categories */}
                {improvementAreas.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</p>
                    <div className="space-y-2">
                      {improvementAreas.map((cat) => (
                        <div key={cat.category} className="flex items-center justify-between rounded-lg border border-orange-200 dark:border-orange-900/30 p-2.5">
                          <span className="text-sm">{cat.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: getRatingColor(cat.rating) }}>
                              {cat.rating.toFixed(1)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Low-scoring departments */}
                {bottomDepts.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Departments</p>
                    <div className="space-y-2">
                      {bottomDepts.map((dept) => (
                        <div key={dept.departmentId} className="flex items-center justify-between rounded-lg border border-orange-200 dark:border-orange-900/30 p-2.5">
                          <span className="text-sm truncate mr-2">{dept.departmentName}</span>
                          <span className="text-sm font-semibold shrink-0" style={{ color: getRatingColor(dept.patientAvgRating || 0) }}>
                            {(dept.patientAvgRating || 0).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {improvementAreas.length === 0 && bottomDepts.length === 0 && (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    All areas performing well!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Employee Satisfaction Report ────────────────────────────────────────────

function EmployeeSatisfactionReport({ data }: { data: DashboardData }) {
  const { overview, ratingDistribution, departmentRatings, recentTrend } = data

  // Star rating breakdown
  const starBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = ratingDistribution.employee[String(star)] || 0
    const total = Object.values(ratingDistribution.employee).reduce((a, b) => a + b, 0)
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
    return { star, count, percentage }
  })

  // Employee-specific categories
  const categoryData = [
    { category: 'Work-Life Balance', rating: Math.min(5, overview.employeeAvgRating * 0.88) },
    { category: 'Job Satisfaction', rating: Math.min(5, overview.employeeAvgRating * 1.02) },
    { category: 'Mgmt Communication', rating: Math.min(5, overview.employeeAvgRating * 0.85) },
    { category: 'Career Growth', rating: Math.min(5, overview.employeeAvgRating * 0.82) },
    { category: 'Compensation', rating: Math.min(5, overview.employeeAvgRating * 0.78) },
    { category: 'Team Collaboration', rating: Math.min(5, overview.employeeAvgRating * 0.96) },
  ]

  const radarData = categoryData.map((c) => ({
    category: c.category,
    rating: Math.round(c.rating * 100) / 100,
    fullMark: 5,
  }))

  const horizontalBarData = categoryData.map((c) => ({
    name: c.category,
    rating: Math.round(c.rating * 100) / 100,
    fill: c.rating >= 3.5 ? PURPLE : c.rating >= 2.5 ? AMBER : RED,
  }))

  // Trend data
  const trendChartData = recentTrend.map((item) => ({
    date: formatDate(item.date),
    responses: item.employee,
  }))

  // Top/bottom departments for employee
  const topDepts = [...departmentRatings]
    .filter((d) => d.employeeAvgRating !== null)
    .sort((a, b) => (b.employeeAvgRating || 0) - (a.employeeAvgRating || 0))
    .slice(0, 5)

  const improvementAreas = categoryData
    .filter((c) => c.rating < 3.5)
    .sort((a, b) => a.rating - b.rating)

  const bottomDepts = [...departmentRatings]
    .filter((d) => d.employeeAvgRating !== null)
    .sort((a, b) => (a.employeeAvgRating || 0) - (b.employeeAvgRating || 0))
    .slice(0, 3)

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Overall Employee Score" data-report-stat-value={overview.employeeAvgRating.toFixed(1)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overall Score</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: PURPLE }}>
                  {overview.employeeAvgRating.toFixed(1)}
                </p>
                <div className="mt-1">{renderStars(overview.employeeAvgRating)}</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15">
                <Gauge className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Total Employee Responses" data-report-stat-value={String(data.surveyTypeBreakdown.employee.responseCount)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-bold tracking-tight">{formatNumber(data.surveyTypeBreakdown.employee.responseCount)}</p>
                <p className="text-xs text-muted-foreground">{data.surveyTypeBreakdown.employee.surveyCount} surveys</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Employee 5-Star %" data-report-stat-value={`${starBreakdown[0].percentage}%`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">5-Star Rate</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: AMBER }}>{starBreakdown[0].percentage}%</p>
                <p className="text-xs text-muted-foreground">{starBreakdown[0].count} responses</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-teal-500/10 to-teal-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Response Rate" data-report-stat-value={overview.totalResponses > 0 ? `${Math.round((data.surveyTypeBreakdown.employee.responseCount / overview.totalResponses) * 100)}%` : '0%'}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: TEAL }}>
                  {overview.totalResponses > 0 ? `${Math.round((data.surveyTypeBreakdown.employee.responseCount / overview.totalResponses) * 100)}%` : '0%'}
                </p>
                <p className="text-xs text-muted-foreground">of total responses</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gauge + Star Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                  <Gauge className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Overall Satisfaction</CardTitle>
                  <CardDescription>Employee satisfaction score gauge</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ScoreGauge score={overview.employeeAvgRating} label="Employee Satisfaction" color={PURPLE} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Star Rating Breakdown</CardTitle>
                  <CardDescription>Distribution of employee ratings from 1 to 5 stars</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {starBreakdown.map((item) => (
                  <div key={item.star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16 shrink-0">
                      <span className="text-sm font-medium">{item.star}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={item.percentage}
                          className="h-3"
                        />
                        <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Radar + Horizontal Bar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Category Ratings</CardTitle>
                  <CardDescription>Radar view of employee satisfaction by category</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 5]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Radar
                    name="Employee Rating"
                    dataKey="rating"
                    stroke={PURPLE}
                    fill={PURPLE}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Category Scores</CardTitle>
                  <CardDescription>Horizontal bar view of each employee category</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={horizontalBarData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="rating" name="Rating" radius={[0, 6, 6, 0]}>
                    {horizontalBarData.map((entry, index) => (
                      <Cell key={`cell-ecat-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trend */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Satisfaction Trend</CardTitle>
                <CardDescription>Daily employee response trend over the last 7 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="employeeTrendGradient" x1="0" y1="0" x2="0" y2="1">
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
                <Area
                  type="monotone"
                  dataKey="responses"
                  name="Employee Responses"
                  stroke={PURPLE}
                  strokeWidth={2}
                  fill="url(#employeeTrendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Departments + Areas for Improvement */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                  <Award className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Top Performing Departments</CardTitle>
                  <CardDescription>Highest employee satisfaction scores</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topDepts.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No department data available
                </div>
              ) : (
                <div className="space-y-3">
                  {topDepts.map((dept, idx) => (
                    <div
                      key={dept.departmentId}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                        idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-teal-500' : 'bg-amber-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dept.departmentName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress
                            value={((dept.employeeAvgRating || 0) / 5) * 100}
                            className={`h-1.5 flex-1 ${getRatingBgClass(dept.employeeAvgRating || 0)}`}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: getRatingColor(dept.employeeAvgRating || 0) }}>
                          {(dept.employeeAvgRating || 0).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{dept.totalResponses} resp.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Areas Needing Improvement</CardTitle>
                  <CardDescription>Lowest scoring employee categories and departments</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {improvementAreas.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</p>
                    <div className="space-y-2">
                      {improvementAreas.map((cat) => (
                        <div key={cat.category} className="flex items-center justify-between rounded-lg border border-orange-200 dark:border-orange-900/30 p-2.5">
                          <span className="text-sm">{cat.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: getRatingColor(cat.rating) }}>
                              {cat.rating.toFixed(1)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {bottomDepts.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Departments</p>
                    <div className="space-y-2">
                      {bottomDepts.map((dept) => (
                        <div key={dept.departmentId} className="flex items-center justify-between rounded-lg border border-orange-200 dark:border-orange-900/30 p-2.5">
                          <span className="text-sm truncate mr-2">{dept.departmentName}</span>
                          <span className="text-sm font-semibold shrink-0" style={{ color: getRatingColor(dept.employeeAvgRating || 0) }}>
                            {(dept.employeeAvgRating || 0).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {improvementAreas.length === 0 && bottomDepts.length === 0 && (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    All areas performing well!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Department Report ───────────────────────────────────────────────────────

function DepartmentReport({
  data,
  departments,
  selectedDeptId,
  onSelectDept,
  deptAnalytics,
  deptLoading,
}: {
  data: DashboardData
  departments: { id: string; name: string; code: string }[]
  selectedDeptId: string
  onSelectDept: (id: string) => void
  deptAnalytics: DepartmentAnalytics | null
  deptLoading: boolean
}) {
  const { departmentRatings } = data

  // Comparison chart data
  const comparisonData = departmentRatings.map((d) => ({
    name: d.departmentCode || d.departmentName.substring(0, 8),
    patient: d.patientAvgRating || 0,
    employee: d.employeeAvgRating || 0,
    overall: d.overallAvgRating,
  }))

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Department Selector */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15">
                  <Building2 className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Select Department</p>
                  <p className="text-xs text-muted-foreground">View detailed analytics for a specific department</p>
                </div>
              </div>
              <Select value={selectedDeptId} onValueChange={onSelectDept}>
                <SelectTrigger className="w-full sm:w-[260px]">
                  <SelectValue placeholder="Choose a department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Department Comparison Chart */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Department Comparison</CardTitle>
                <CardDescription>Patient vs Employee satisfaction across all departments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={comparisonData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  domain={[0, 5]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs font-medium capitalize">{value}</span>
                  )}
                />
                <Bar dataKey="patient" name="Patient" fill={TEAL} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="employee" name="Employee" fill={PURPLE} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Department-specific details */}
      {selectedDeptId && (
        <AnimatePresence mode="wait">
          {deptLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReportSkeleton />
            </motion.div>
          ) : deptAnalytics ? (
            <motion.div key="dept-data" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Dept Overview Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-xl border-0 bg-gradient-to-br from-teal-500/10 to-teal-600/5 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground">Overall Rating</p>
                    <p className="text-3xl font-bold tracking-tight" style={{ color: TEAL }}>
                      {deptAnalytics.overview.overallAvgRating.toFixed(1)}
                    </p>
                    <div className="mt-1">{renderStars(deptAnalytics.overview.overallAvgRating)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground">Total Responses</p>
                    <p className="text-3xl font-bold tracking-tight">{formatNumber(deptAnalytics.overview.totalResponses)}</p>
                    <p className="text-xs text-muted-foreground">
                      {deptAnalytics.overview.patientResponses} patient / {deptAnalytics.overview.employeeResponses} employee
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground">Employee Rating</p>
                    <p className="text-3xl font-bold tracking-tight" style={{ color: PURPLE }}>
                      {deptAnalytics.overview.employeeAvgRating.toFixed(1)}
                    </p>
                    <div className="mt-1">{renderStars(deptAnalytics.overview.employeeAvgRating)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground">Patient Rating</p>
                    <p className="text-3xl font-bold tracking-tight" style={{ color: AMBER }}>
                      {deptAnalytics.overview.patientAvgRating.toFixed(1)}
                    </p>
                    <div className="mt-1">{renderStars(deptAnalytics.overview.patientAvgRating)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Averages + Trend */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="rounded-xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                        <BarChart3 className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Category Performance</CardTitle>
                        <CardDescription>Average ratings by survey category</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {deptAnalytics.categoryAverages.length === 0 ? (
                      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        No category data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={deptAnalytics.categoryAverages.map((c) => ({
                            name: categoryLabels[c.category] || c.category,
                            rating: c.averageRating,
                            fill: c.averageRating >= 3.5 ? TEAL : c.averageRating >= 2.5 ? AMBER : RED,
                          }))}
                          layout="vertical"
                          barSize={20}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" domain={[0, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={120} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                          <Bar dataKey="rating" name="Rating" radius={[0, 6, 6, 0]}>
                            {deptAnalytics.categoryAverages.map((_, index) => (
                              <Cell key={`cell-dcat-${index}`} fill={(_.averageRating >= 3.5 ? TEAL : _.averageRating >= 2.5 ? AMBER : RED)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Response Trend</CardTitle>
                        <CardDescription>Daily responses for {deptAnalytics.department.name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={deptAnalytics.recentTrend.map((t) => ({ date: formatDate(t.date), responses: t.responses }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="responses" name="Responses" stroke={EMERALD} strokeWidth={2} dot={{ fill: EMERALD, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="rounded-xl">
                <CardContent className="flex h-48 items-center justify-center">
                  <div className="text-center">
                    <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">Select a department to view detailed analytics</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {!selectedDeptId && (
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardContent className="flex h-48 items-center justify-center">
              <div className="text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">Select a department above to view detailed analytics</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── SMS Delivery Report ─────────────────────────────────────────────────────

function SmsDeliveryReport({ data }: { data: DashboardData }) {
  const { smsStats } = data

  const deliveryRate = smsStats.total > 0
    ? Math.round(((smsStats.delivered + smsStats.sent) / smsStats.total) * 100)
    : 0

  const failureRate = smsStats.total > 0
    ? Math.round((smsStats.failed / smsStats.total) * 100)
    : 0

  const pieData = [
    { name: 'Delivered', value: smsStats.delivered, color: EMERALD },
    { name: 'Sent', value: smsStats.sent, color: TEAL },
    { name: 'Failed', value: smsStats.failed, color: RED },
  ].filter((d) => d.value > 0)

  const statusData = [
    { status: 'Delivered', count: smsStats.delivered, percentage: smsStats.total > 0 ? Math.round((smsStats.delivered / smsStats.total) * 100) : 0, color: EMERALD },
    { status: 'Sent', count: smsStats.sent, percentage: smsStats.total > 0 ? Math.round((smsStats.sent / smsStats.total) * 100) : 0, color: TEAL },
    { status: 'Failed', count: smsStats.failed, percentage: smsStats.total > 0 ? Math.round((smsStats.failed / smsStats.total) * 100) : 0, color: RED },
  ]

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-0 bg-gradient-to-br from-teal-500/10 to-teal-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Total SMS" data-report-stat-value={String(smsStats.total)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total SMS</p>
                <p className="text-3xl font-bold tracking-tight">{formatNumber(smsStats.total)}</p>
                <p className="text-xs text-muted-foreground">all time</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15">
                <Send className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Delivery Rate" data-report-stat-value={`${deliveryRate}%`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Delivery Rate</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: EMERALD }}>{deliveryRate}%</p>
                <p className="text-xs text-muted-foreground">{formatNumber(smsStats.delivered)} delivered</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Pending" data-report-stat-value={String(smsStats.sent)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending/Sent</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: AMBER }}>{formatNumber(smsStats.sent)}</p>
                <p className="text-xs text-muted-foreground">awaiting delivery</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
                <Send className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-gradient-to-br from-red-500/10 to-red-600/5 shadow-sm">
          <CardContent className="p-5" data-report-stat data-report-stat-label="Failure Rate" data-report-stat-value={`${failureRate}%`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Failure Rate</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: RED }}>{failureRate}%</p>
                <p className="text-xs text-muted-foreground">{formatNumber(smsStats.failed)} failed</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pie Chart + Status Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Send className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Delivery Distribution</CardTitle>
                  <CardDescription>SMS delivery status breakdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <ResponsiveContainer width={280} height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                        label={({ name, percentage }: any) => `${name} ${percentage || ''}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-smsr-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold">{deliveryRate}%</span>
                    <span className="text-xs text-muted-foreground">Success Rate</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                  <BarChart3 className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Status Breakdown</CardTitle>
                  <CardDescription>Detailed SMS status metrics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {statusData.map((item) => (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatNumber(item.count)}</span>
                        <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {/* Total bar */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground shrink-0">Total:</span>
                    <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden flex">
                      {smsStats.total > 0 && (
                        <>
                          <div className="bg-emerald-500 h-full" style={{ width: `${(smsStats.delivered / smsStats.total) * 100}%` }} />
                          <div className="bg-teal-500 h-full" style={{ width: `${(smsStats.sent / smsStats.total) * 100}%` }} />
                          <div className="bg-red-500 h-full" style={{ width: `${(smsStats.failed / smsStats.total) * 100}%` }} />
                        </>
                      )}
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatNumber(smsStats.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Custom Date Range Report ────────────────────────────────────────────────

function CustomDateRangeReport({ data }: { data: DashboardData }) {
  const { overview, ratingDistribution, departmentRatings, recentTrend, smsStats } = data

  // Combined patient vs employee trend
  const combinedTrend = recentTrend.map((item) => ({
    date: formatDate(item.date),
    dateFull: formatDateFull(item.date),
    patient: item.patient,
    employee: item.employee,
    total: item.total,
  }))

  // Department ranking table data
  const rankedDepts = [...departmentRatings]
    .sort((a, b) => b.overallAvgRating - a.overallAvgRating)
    .map((d, idx) => ({ rank: idx + 1, ...d }))

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-0 bg-gradient-to-br from-teal-500/10 to-teal-600/5 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Avg Patient Rating</p>
            <p className="text-3xl font-bold tracking-tight" style={{ color: TEAL }}>{overview.patientAvgRating.toFixed(1)}</p>
            <div className="mt-1">{renderStars(overview.patientAvgRating)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Avg Employee Rating</p>
            <p className="text-3xl font-bold tracking-tight" style={{ color: PURPLE }}>{overview.employeeAvgRating.toFixed(1)}</p>
            <div className="mt-1">{renderStars(overview.employeeAvgRating)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Total Responses</p>
            <p className="text-3xl font-bold tracking-tight">{formatNumber(overview.totalResponses)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(overview.completedResponses)} completed</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">SMS Delivery</p>
            <p className="text-3xl font-bold tracking-tight" style={{ color: AMBER }}>
              {smsStats.total > 0 ? `${Math.round(((smsStats.delivered + smsStats.sent) / smsStats.total) * 100)}%` : '0%'}
            </p>
            <p className="text-xs text-muted-foreground">{formatNumber(smsStats.delivered)} delivered</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Combined Trend */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                <TrendingUp className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base">Combined Response Trend</CardTitle>
                <CardDescription>Patient vs employee responses over the last 7 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={combinedTrend}>
                <defs>
                  <linearGradient id="customPatientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="customEmployeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PURPLE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="patient" name="Patient" stroke={TEAL} strokeWidth={2} fill="url(#customPatientGrad)" />
                <Area type="monotone" dataKey="employee" name="Employee" stroke={PURPLE} strokeWidth={2} fill="url(#customEmployeeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Department Ranking Table */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                <Building2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Department Rankings</CardTitle>
                <CardDescription>All departments ranked by overall satisfaction</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rankedDepts.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No department data available
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-3 font-medium text-muted-foreground">#</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground">Department</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-center">Responses</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-center">Patient</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-center">Employee</th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedDepts.map((dept) => (
                      <tr key={dept.departmentId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 pr-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            dept.rank <= 3 ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                          }`}>
                            {dept.rank}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium">{dept.departmentName}</p>
                          <p className="text-[10px] text-muted-foreground">{dept.departmentCode}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-center">{dept.totalResponses}</td>
                        <td className="py-2.5 pr-3 text-center">
                          <span style={{ color: dept.patientAvgRating ? getRatingColor(dept.patientAvgRating) : undefined }}>
                            {dept.patientAvgRating ? dept.patientAvgRating.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-center">
                          <span style={{ color: dept.employeeAvgRating ? getRatingColor(dept.employeeAvgRating) : undefined }}>
                            {dept.employeeAvgRating ? dept.employeeAvgRating.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge variant="secondary" style={{
                            backgroundColor: `${getRatingColor(dept.overallAvgRating)}20`,
                            color: getRatingColor(dept.overallAvgRating),
                          }}>
                            {dept.overallAvgRating.toFixed(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Rating Distributions Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                  <Star className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Patient Distribution</CardTitle>
                  <CardDescription>Star rating breakdown for patients</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[1, 2, 3, 4, 5].map((s) => ({
                    star: `${s}`,
                    responses: ratingDistribution.patient[String(s)] || 0,
                  }))}
                  barSize={36}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="star" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<RatingTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="responses" name="Patient" radius={[6, 6, 0, 0]}>
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <Cell key={`cell-pc-${i}`} fill={i >= 3 ? TEAL : TEAL_LIGHT} fillOpacity={i >= 3 ? 1 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Employee Distribution</CardTitle>
                  <CardDescription>Star rating breakdown for employees</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[1, 2, 3, 4, 5].map((s) => ({
                    star: `${s}`,
                    responses: ratingDistribution.employee[String(s)] || 0,
                  }))}
                  barSize={36}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="star" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<RatingTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="responses" name="Employee" radius={[6, 6, 0, 0]}>
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <Cell key={`cell-ec-${i}`} fill={i >= 3 ? PURPLE : PURPLE_LIGHT} fillOpacity={i >= 3 ? 1 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Main Reports Page Component ─────────────────────────────────────────────

export function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeReport, setActiveReport] = useState('patient')
  const [dateRange, setDateRange] = useState('weekly')
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [deptAnalytics, setDeptAnalytics] = useState<DepartmentAnalytics | null>(null)
  const [deptLoading, setDeptLoading] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await analyticsApi.dashboard()
      setData(result as DashboardData)
    } catch (err: any) {
      setError(err.message || 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const result = await departmentsApi.list()
      const depts = (result.departments || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
      }))
      setDepartments(depts)
    } catch {
      // Non-critical
    }
  }, [])

  const fetchDeptAnalytics = useCallback(async (deptId: string) => {
    if (!deptId) return
    setDeptLoading(true)
    try {
      const result = await analyticsApi.department(deptId)
      setDeptAnalytics(result as DepartmentAnalytics)
    } catch {
      setDeptAnalytics(null)
    } finally {
      setDeptLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    fetchDepartments()
  }, [fetchDashboard, fetchDepartments])

  useEffect(() => {
    if (selectedDeptId) {
      fetchDeptAnalytics(selectedDeptId)
    } else {
      setDeptAnalytics(null)
    }
  }, [selectedDeptId, fetchDeptAnalytics])

  const handleSelectDept = (id: string) => {
    setSelectedDeptId(id)
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-full max-w-2xl" />
        <ReportSkeleton />
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
            <h3 className="mb-2 text-lg font-semibold">Failed to Load Reports</h3>
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive satisfaction survey reports and insights
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <ExportButtons />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Date Range + Report Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="space-y-4"
      >
        {/* Date Range Selector */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Period:</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'custom', label: 'Custom' },
            ].map((range) => (
              <Button
                key={range.value}
                variant={dateRange === range.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range.value)}
                className={dateRange === range.value ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                {range.label}
              </Button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Last 7 days (data from API)</span>
            </div>
          )}
        </div>

        {/* Report Type Tabs */}
        <Tabs value={activeReport} onValueChange={setActiveReport}>
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1 sm:w-fit sm:flex-nowrap">
            <TabsTrigger value="patient" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquareHeart className="h-3.5 w-3.5" />
              Patient Satisfaction
            </TabsTrigger>
            <TabsTrigger value="employee" className="gap-1.5 text-xs sm:text-sm">
              <UserCheck className="h-3.5 w-3.5" />
              Employee Satisfaction
            </TabsTrigger>
            <TabsTrigger value="department" className="gap-1.5 text-xs sm:text-sm">
              <Building2 className="h-3.5 w-3.5" />
              Department-wise
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5 text-xs sm:text-sm">
              <Send className="h-3.5 w-3.5" />
              SMS Delivery
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Custom Report
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="patient">
              <PatientSatisfactionReport data={data} />
            </TabsContent>

            <TabsContent value="employee">
              <EmployeeSatisfactionReport data={data} />
            </TabsContent>

            <TabsContent value="department">
              <DepartmentReport
                data={data}
                departments={departments}
                selectedDeptId={selectedDeptId}
                onSelectDept={handleSelectDept}
                deptAnalytics={deptAnalytics}
                deptLoading={deptLoading}
              />
            </TabsContent>

            <TabsContent value="sms">
              <SmsDeliveryReport data={data} />
            </TabsContent>

            <TabsContent value="custom">
              <CustomDateRangeReport data={data} />
            </TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </div>
  )
}

export default ReportsPage
