'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  Building2,
  ClipboardList,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Shield,
  Star,
  CalendarDays,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  FileText,
  LayoutDashboard,
  UserCircle,
  PencilLine,
  Check,
  X,
  Inbox,
  BarChart3,
  CalendarCheck,
  Stethoscope,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/stores'

// ─── Dashboard Config ────────────────────────────────────────────────────────

type DashboardMode = 'patient' | 'employee'

interface DashboardConfig {
  mode: DashboardMode
  surveyType: 'PATIENT' | 'EMPLOYEE'
  themeGradient: string
  themeGradientDark: string
  headerIconBg: string
  headerIcon: typeof Heart
  headerIconClass: string
  portalName: string
  accentColor: string
  accentBg: string
  badgeClass: string
  showAppointments: boolean
  emptySurveysMsg: string
  privacyTitle: string
  privacyMsg: string
}

const PATIENT_CONFIG: DashboardConfig = {
  mode: 'patient',
  surveyType: 'PATIENT',
  themeGradient: 'from-teal-50 via-emerald-50 to-teal-100',
  themeGradientDark: 'dark:from-teal-950 dark:via-emerald-950 dark:to-teal-900',
  headerIconBg: 'bg-gradient-to-br from-teal-400 to-emerald-500',
  headerIcon: Heart,
  headerIconClass: 'h-4 w-4 text-white fill-white/30',
  portalName: 'Patient Portal',
  accentColor: 'text-teal-600 dark:text-teal-400',
  accentBg: 'bg-teal-100 dark:bg-teal-900/30',
  badgeClass: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
  showAppointments: true,
  emptySurveysMsg: 'No patient surveys available right now',
  privacyTitle: 'Your Privacy Matters',
  privacyMsg: 'Your responses are confidential and used only to improve our healthcare services. For non-anonymous surveys, your name and department are recorded for follow-up purposes only.',
}

const EMPLOYEE_CONFIG: DashboardConfig = {
  mode: 'employee',
  surveyType: 'EMPLOYEE',
  themeGradient: 'from-violet-50 via-purple-50 to-fuchsia-50',
  themeGradientDark: 'dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950',
  headerIconBg: 'bg-gradient-to-br from-violet-400 to-purple-500',
  headerIcon: Building2,
  headerIconClass: 'h-4 w-4 text-white fill-white/30',
  portalName: 'Employee Portal',
  accentColor: 'text-violet-600 dark:text-violet-400',
  accentBg: 'bg-violet-100 dark:bg-violet-900/30',
  badgeClass: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
  showAppointments: false,
  emptySurveysMsg: 'No employee surveys available right now',
  privacyTitle: 'Confidential Feedback',
  privacyMsg: 'Your feedback is anonymous and confidential. It is used solely to improve the workplace environment. Your identity is never shared without your consent.',
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface SurveyInfo {
  id: string
  title: string
  description?: string
  type: string
  isAnonymous: boolean
  createdAt: string
}

interface SurveyAnswerInfo {
  id: string
  questionId: string
  answerText?: string | null
  answerNumber?: number | null
  answerChoice?: string | null
  question: {
    questionText: string
    questionType: string
  }
}

interface ResponseInfo {
  id: string
  surveyId: string
  status: string
  overallRating: number | null
  submittedAt: string
  survey: {
    id: string
    title: string
    type: string
  }
  answers: SurveyAnswerInfo[]
}

interface RespondentStats {
  completedCount: number
  averageRating: number
  lastResponseDate: string | null
}

interface AppointmentInfo {
  id: string
  patientName: string
  patientPhone: string
  patientEmail?: string
  doctorName?: string
  appointmentDate: string
  appointmentTime: string
  status: string
  visitType?: string
  notes?: string
  department?: {
    id: string
    name: string
    code: string
  }
}

interface Branding {
  hospitalName: string
  hospitalLogoUrl: string
  hospitalSubtitle: string
  footerText: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

// ─── Animation Variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function StatsCards({
  stats,
  pendingCount,
  upcomingAppointmentsCount,
  loading,
  showAppointments,
}: {
  stats: RespondentStats
  pendingCount: number
  upcomingAppointmentsCount: number
  loading: boolean
  showAppointments: boolean
}) {
  const cards = [
    {
      label: 'Surveys Completed',
      value: stats.completedCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Pending Surveys',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    ...(showAppointments
      ? [{
          label: 'Upcoming Appts',
          value: upcomingAppointmentsCount,
          icon: CalendarCheck,
          color: 'text-teal-600 dark:text-teal-400',
          bg: 'bg-teal-100 dark:bg-teal-900/30',
        }]
      : [{
          label: 'Average Rating',
          value: stats.averageRating || '—',
          icon: Star,
          color: 'text-violet-600 dark:text-violet-400',
          bg: 'bg-violet-100 dark:bg-violet-900/30',
        }]),
    {
      label: 'Last Response',
      value: formatRelativeTime(stats.lastResponseDate),
      icon: showAppointments ? Star : CalendarDays,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08, duration: 0.4 }}
        >
          <Card className="relative overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {card.label}
                    </span>
                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/25'
          }`}
        />
      ))}
      <span className="text-sm font-medium text-muted-foreground ml-1">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

function SurveyList({
  surveys,
  completedSurveyIds,
  loading,
  onTakeSurvey,
  emptyMessage,
}: {
  surveys: SurveyInfo[]
  completedSurveyIds: Set<string>
  loading: boolean
  onTakeSurvey: (id: string) => void
  emptyMessage?: string
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (surveys.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{emptyMessage || 'No surveys available right now'}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Please check back later for new surveys</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {surveys.map((survey, idx) => {
        const isCompleted = completedSurveyIds.has(survey.id)
        return (
          <motion.div
            key={survey.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
          >
            <Card
              className={`overflow-hidden transition-shadow hover:shadow-md ${
                isCompleted ? 'border-emerald-200 dark:border-emerald-800/40' : ''
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icon */}
                  <div
                    className={`flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0 ${
                      survey.type === 'PATIENT'
                        ? 'bg-teal-100 dark:bg-teal-900/30'
                        : 'bg-purple-100 dark:bg-purple-900/30'
                    }`}
                  >
                    {survey.type === 'PATIENT' ? (
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {survey.title}
                      </h4>
                      {isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    {survey.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                        {survey.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          survey.type === 'PATIENT'
                            ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 text-[10px] sm:text-xs'
                            : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] sm:text-xs'
                        }
                      >
                        {survey.type === 'PATIENT' ? 'Patient Survey' : 'Employee Survey'}
                      </Badge>
                      {isCompleted && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] sm:text-xs">
                          Completed
                        </Badge>
                      )}
                      {!survey.isAnonymous && (
                        <Badge
                          variant="outline"
                          className="text-[10px] sm:text-xs gap-1 border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-300"
                        >
                          <Shield className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0 self-center">
                    {isCompleted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Completed</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onTakeSurvey(survey.id)}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">Take Survey</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

function RecentResponses({
  responses,
  loading,
}: {
  responses: ResponseInfo[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No responses yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Your completed survey responses will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {responses.slice(0, 5).map((response, idx) => (
        <motion.div
          key={response.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Icon */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                    response.survey.type === 'PATIENT'
                      ? 'bg-teal-100 dark:bg-teal-900/30'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}
                >
                  {response.survey.type === 'PATIENT' ? (
                    <Heart className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  ) : (
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {response.survey.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(response.submittedAt)}
                    </span>
                    <Badge
                      className={`text-[10px] ${
                        response.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                    >
                      {response.status === 'COMPLETED' ? 'Completed' : 'Partial'}
                    </Badge>
                  </div>
                </div>

                {/* Rating */}
                {response.overallRating !== null && response.overallRating !== undefined && (
                  <div className="shrink-0 hidden sm:block">
                    <StarRating rating={response.overallRating} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function ProfileSection({ user, config }: { user: any; config: DashboardConfig }) {
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneValue, setPhoneValue] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const { updateUser } = useAuthStore()

  useEffect(() => {
    setPhoneValue(user?.phone || '')
  }, [user?.phone])

  const handleSavePhone = async () => {
    setSaving(true)
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: phoneValue }),
      })
      if (res.ok) {
        updateUser({ phone: phoneValue })
        setEditingPhone(false)
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const profileItems = [
    {
      icon: User,
      label: 'Full Name',
      value: user?.name || '—',
    },
    {
      icon: Mail,
      label: 'Email',
      value: user?.email || '—',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: user?.phone || '—',
      editable: true,
    },
    {
      icon: MapPin,
      label: 'Department',
      value: user?.department?.name || 'Not assigned',
    },
    {
      icon: Award,
      label: 'Role',
      value: user?.role?.displayName || 'Respondent',
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className={`h-24 bg-gradient-to-r ${config.mode === 'patient' ? 'from-teal-400 via-emerald-400 to-teal-500 dark:from-teal-700 dark:via-emerald-700 dark:to-teal-800' : 'from-violet-400 via-purple-400 to-violet-500 dark:from-violet-700 dark:via-purple-700 dark:to-violet-800'}`} />
        <CardContent className="relative px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className={`bg-gradient-to-br ${config.mode === 'patient' ? 'from-teal-500 to-emerald-600' : 'from-violet-500 to-purple-600'} text-white text-xl font-bold`}>
                {user?.name ? getInitials(user.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left pb-1">
              <h3 className="text-lg font-bold text-foreground">{user?.name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <Badge className={`${config.badgeClass} text-xs`}>
                  {user?.role?.displayName || 'Respondent'}
                </Badge>
                {user?.department && (
                  <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                    {user.department.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {profileItems.map((item, idx) => (
            <motion.div key={item.label} variants={itemVariants}>
              <div className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/60 shrink-0">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.editable && editingPhone ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Enter phone number"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSavePhone}
                        disabled={saving}
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPhone(false)
                          setPhoneValue(user?.phone || '')
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                      {item.editable && (
                        <button
                          onClick={() => setEditingPhone(true)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          aria-label="Edit phone number"
                        >
                          <PencilLine className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {idx < profileItems.length - 1 && <Separator />}
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Member Since Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.accentBg} shrink-0`}>
            <CalendarDays className={`h-5 w-5 ${config.accentColor}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Member Since</p>
            <p className="text-sm font-semibold text-foreground">
              {/* Use a reasonable default since createdAt is not in the auth store */}
              Today
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function RespondentDashboard({ config }: { config: DashboardConfig }) {
  const { user, logout, token } = useAuthStore()
  const [surveys, setSurveys] = useState<SurveyInfo[]>([])
  const [responses, setResponses] = useState<ResponseInfo[]>([])
  const [stats, setStats] = useState<RespondentStats>({
    completedCount: 0,
    averageRating: 0,
    lastResponseDate: null,
  })
  const [surveysLoading, setSurveysLoading] = useState(true)
  const [responsesLoading, setResponsesLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentInfo[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [branding, setBranding] = useState<Branding>({
    hospitalName: 'City General Hospital',
    hospitalLogoUrl: '',
    hospitalSubtitle: 'Hospital Survey System',
    footerText: 'Hospital Survey Management System © 2024',
  })

  // Fetch branding
  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        setBranding({
          hospitalName: data.hospitalName || 'City General Hospital',
          hospitalLogoUrl: data.hospitalLogoUrl || '',
          hospitalSubtitle: data.hospitalSubtitle || 'Hospital Survey System',
          footerText: data.footerText || 'Hospital Survey Management System © 2024',
        })
      })
      .catch(() => {})
  }, [])

  // Fetch available surveys
  useEffect(() => {
    fetch('/api/surveys/public/list')
      .then((res) => res.json())
      .then((data) => {
        const list = data.surveys || []
        setSurveys(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setSurveysLoading(false))
  }, [])

  // Fetch user responses
  useEffect(() => {
    if (!token) return
    fetch('/api/respondent/responses', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then((data) => {
        setResponses(data.responses || [])
        if (data.stats) {
          setStats(data.stats)
        }
      })
      .catch(() => {})
      .finally(() => setResponsesLoading(false))
  }, [token])

  // Fetch patient appointments
  useEffect(() => {
    if (!token) return
    fetch('/api/respondent/appointments', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then((data) => {
        setAppointments(data.appointments || [])
      })
      .catch(() => {})
      .finally(() => setAppointmentsLoading(false))
  }, [token])

  // Compute completed survey IDs
  const completedSurveyIds = useMemo(() => {
    const ids = new Set<string>()
    responses.forEach((r) => {
      if (r.status === 'COMPLETED') {
        ids.add(r.surveyId)
      }
    })
    return ids
  }, [responses])

  // Pending surveys = available surveys not yet completed
  const pendingCount = useMemo(() => {
    return surveys.filter((s) => !completedSurveyIds.has(s.id)).length
  }, [surveys, completedSurveyIds])

  // Filter surveys by dashboard type (patient sees PATIENT, employee sees EMPLOYEE)
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => s.type === config.surveyType)
  }, [surveys, config.surveyType])

  // Filtered pending count
  const filteredPendingCount = useMemo(() => {
    return filteredSurveys.filter((s) => !completedSurveyIds.has(s.id)).length
  }, [filteredSurveys, completedSurveyIds])

  // Filter responses by survey type
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => r.survey.type === config.surveyType)
  }, [responses, config.surveyType])

  // Upcoming appointments
  const upcomingAppointments = useMemo(() => {
    const now = new Date()
    return appointments.filter(
      (a) => new Date(a.appointmentDate) >= now && a.status !== 'CANCELLED'
    )
  }, [appointments])

  const handleTakeSurvey = (surveyId: string) => {
    window.open(`/s/${surveyId}`, '_blank')
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.themeGradient} ${config.themeGradientDark} flex flex-col`}>
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="border-b bg-white/80 dark:bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.hospitalLogoUrl ? (
              <img
                src={branding.hospitalLogoUrl}
                alt={branding.hospitalName}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${config.headerIconBg}`}>
                <config.headerIcon className={config.headerIconClass} />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-foreground">{branding.hospitalName}</h1>
              <p className="text-[10px] text-muted-foreground">{branding.hospitalSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Avatar className="h-8 w-8 sm:hidden">
              <AvatarFallback className={`bg-gradient-to-br ${config.mode === 'patient' ? 'from-teal-500 to-emerald-600' : 'from-violet-500 to-purple-600'} text-white text-xs font-bold`}>
                {user?.name ? getInitials(user.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <Badge
              variant="outline"
              className={`text-xs gap-1 ${config.badgeClass} hidden sm:inline-flex`}
            >
              <Shield className="h-3 w-3" />
              {user?.role?.displayName || 'Respondent'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 sm:py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Avatar className={`h-14 w-14 border-2 ${config.mode === 'patient' ? 'border-emerald-200 dark:border-emerald-800' : 'border-violet-200 dark:border-violet-800'} shadow-md`}>
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className={`bg-gradient-to-br ${config.mode === 'patient' ? 'from-teal-500 to-emerald-600' : 'from-violet-500 to-purple-600'} text-white text-lg font-bold`}>
              {user?.name ? getInitials(user.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.department
                ? `${user.department.name} · ${user?.email}`
                : user?.email}
            </p>
          </div>
        </motion.div>

        {/* ─── Tab Navigation ──────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`w-full sm:w-auto ${config.showAppointments ? 'grid-cols-4' : 'grid-cols-3'} grid sm:inline-flex h-10 bg-white/60 dark:bg-card/60 backdrop-blur-sm border`}>
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="surveys" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Surveys</span>
            </TabsTrigger>
            {config.showAppointments && (
              <TabsTrigger value="appointments" className="gap-1.5 text-xs sm:text-sm">
                <CalendarCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Appointments</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── Overview Tab ──────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <StatsCards
              stats={stats}
              pendingCount={filteredPendingCount}
              upcomingAppointmentsCount={upcomingAppointments.length}
              loading={responsesLoading}
              showAppointments={config.showAppointments}
            />

            {/* Available Surveys (compact on overview) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ClipboardList className={`h-5 w-5 ${config.accentColor}`} />
                  Available {config.mode === 'patient' ? 'Patient' : 'Employee'} Surveys
                </h3>
                {filteredSurveys.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('surveys')}
                    className={`${config.accentColor} hover:opacity-80 text-xs`}
                  >
                    View All →
                  </Button>
                )}
              </div>
              <SurveyList
                surveys={filteredSurveys.slice(0, 3)}
                completedSurveyIds={completedSurveyIds}
                loading={surveysLoading}
                onTakeSurvey={handleTakeSurvey}
                emptyMessage={config.emptySurveysMsg}
              />
            </div>

            {/* Recent Responses */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className={`h-5 w-5 ${config.accentColor}`} />
                My Recent Responses
              </h3>
              <RecentResponses responses={filteredResponses} loading={responsesLoading} />
            </div>

            {/* Privacy Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className={`${config.mode === 'patient' ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800' : 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800'}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Shield className={`h-5 w-5 ${config.accentColor} mt-0.5 shrink-0`} />
                    <div>
                      <h4 className={`text-sm font-semibold ${config.accentColor} mb-1`}>
                        {config.privacyTitle}
                      </h4>
                      <p className={`text-xs ${config.accentColor}/80 leading-relaxed`}>
                        {config.privacyMsg}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ─── My Surveys Tab ────────────────────────────────────── */}
          <TabsContent value="surveys" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* All Available Surveys */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ClipboardList className={`h-5 w-5 ${config.accentColor}`} />
                  All Available {config.mode === 'patient' ? 'Patient' : 'Employee'} Surveys
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredSurveys.length}
                  </Badge>
                </h3>
                <div className="max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                  <SurveyList
                    surveys={filteredSurveys}
                    completedSurveyIds={completedSurveyIds}
                    loading={surveysLoading}
                    onTakeSurvey={handleTakeSurvey}
                    emptyMessage={config.emptySurveysMsg}
                  />
                </div>
              </div>

              {/* All Responses */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileText className={`h-5 w-5 ${config.accentColor}`} />
                  My Responses
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredResponses.length}
                  </Badge>
                </h3>
                <div className="max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                  <RecentResponses responses={filteredResponses} loading={responsesLoading} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Appointments Tab ───────────────────────────────────── */}
          {config.showAppointments && (
            <TabsContent value="appointments" className="space-y-6">
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Card key={i}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <CalendarCheck className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No appointments found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Your upcoming and past appointments will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Upcoming Appointments */}
                  {upcomingAppointments.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-emerald-600" />
                        Upcoming Appointments
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {upcomingAppointments.length}
                        </Badge>
                      </h3>
                      <div className="space-y-3">
                        {upcomingAppointments.map((apt, idx) => (
                          <motion.div
                            key={apt.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04, duration: 0.3 }}
                          >
                            <Card className="overflow-hidden border-emerald-200 dark:border-emerald-800/40">
                              <CardContent className="p-4 sm:p-5">
                                <div className="flex items-start gap-3 sm:gap-4">
                                  <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                                    <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm sm:text-base font-semibold text-foreground">
                                      {apt.doctorName ? `Dr. ${apt.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'Appointment'}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" />
                                        {formatDate(apt.appointmentDate)}
                                      </span>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {apt.appointmentTime}
                                      </span>
                                      {apt.department && (
                                        <Badge variant="outline" className="text-[10px] sm:text-xs border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                                          {apt.department.name}
                                        </Badge>
                                      )}
                                      {apt.visitType && (
                                        <Badge className="bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 text-[10px] sm:text-xs">
                                          {apt.visitType}
                                        </Badge>
                                      )}
                                    </div>
                                    {apt.notes && (
                                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                        {apt.notes}
                                      </p>
                                    )}
                                  </div>
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] sm:text-xs shrink-0">
                                    {apt.status}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Appointments */}
                  {(() => {
                    const pastApts = appointments.filter(
                      (a) => new Date(a.appointmentDate) < new Date() || a.status === 'CANCELLED'
                    )
                    if (pastApts.length === 0) return null
                    return (
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-muted-foreground" />
                          Past Appointments
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {pastApts.length}
                          </Badge>
                        </h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                          {pastApts.map((apt, idx) => (
                            <motion.div
                              key={apt.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03, duration: 0.3 }}
                            >
                              <Card className="overflow-hidden opacity-75">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/60 shrink-0">
                                      <CalendarDays className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-foreground truncate">
                                        {apt.doctorName ? `Dr. ${apt.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'Appointment'}
                                        {apt.department && ` · ${apt.department.name}`}
                                      </h4>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(apt.appointmentDate)} · {apt.appointmentTime}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] shrink-0 ${
                                        apt.status === 'CANCELLED'
                                          ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400'
                                          : 'border-muted-foreground/30 text-muted-foreground'
                                      }`}
                                    >
                                      {apt.status}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </TabsContent>
          )}

          {/* ─── My Profile Tab ────────────────────────────────────── */}
          <TabsContent value="profile">
            <ProfileSection user={user} config={config} />
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t bg-white/50 dark:bg-card/50 py-3 px-4 mt-auto">
        <p className="text-xs text-center text-muted-foreground">{branding.footerText}</p>
      </footer>
    </div>
  )
}

// ─── Named Exports ──────────────────────────────────────────────────────────

export function PatientDashboard() {
  return <RespondentDashboard config={PATIENT_CONFIG} />
}

export function EmployeeDashboard() {
  return <RespondentDashboard config={EMPLOYEE_CONFIG} />
}
