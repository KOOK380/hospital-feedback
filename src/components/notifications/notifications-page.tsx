'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  MessageSquare,
  RefreshCw,
  CheckCheck,
  Filter,
  BellOff,
  Mail,
  MailOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { notificationsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'SURVEY' | 'SMS'

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  link?: string
  createdAt: string
}

type ReadFilter = 'all' | 'unread' | 'read'

// ─── Type Config ─────────────────────────────────────────────────────────────

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; bgClass: string; iconColor: string; label: string; borderClass: string }
> = {
  INFO: {
    icon: Info,
    bgClass: 'bg-teal-100 dark:bg-teal-900/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
    label: 'Info',
    borderClass: 'border-l-teal-500',
  },
  WARNING: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'Warning',
    borderClass: 'border-l-amber-500',
  },
  SUCCESS: {
    icon: CheckCircle2,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'Success',
    borderClass: 'border-l-emerald-500',
  },
  ERROR: {
    icon: XCircle,
    bgClass: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Error',
    borderClass: 'border-l-red-500',
  },
  SURVEY: {
    icon: ClipboardList,
    bgClass: 'bg-teal-100 dark:bg-teal-900/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
    label: 'Survey',
    borderClass: 'border-l-teal-500',
  },
  SMS: {
    icon: MessageSquare,
    bgClass: 'bg-purple-100 dark:bg-purple-900/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    label: 'SMS',
    borderClass: 'border-l-purple-500',
  },
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, x: 16, transition: { duration: 0.2 } },
}

const statCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
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
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
            <div className="flex-1" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Notification list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/20">
          <BellOff className="h-10 w-10 text-teal-400 dark:text-teal-500" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <span className="text-xs">0</span>
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {hasFilters ? 'No matching notifications' : 'All caught up!'}
      </h3>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        {hasFilters
          ? 'No notifications match your current filters. Try adjusting your filter settings.'
          : 'You have no notifications right now. When you receive alerts, survey updates, or system messages, they will appear here.'}
      </p>
      {!hasFilters && (
        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 px-3 py-2">
            <Info className="h-4 w-4 text-teal-500" />
            <span className="text-xs text-teal-700 dark:text-teal-300">Info alerts</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-700 dark:text-emerald-300">Success</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 px-3 py-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-purple-700 dark:text-purple-300">SMS</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Notification Item ───────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
}) {
  const config = typeConfig[notification.type] || typeConfig.INFO
  const Icon = config.icon

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id)
    }
  }

  return (
    <motion.div
      layout
      variants={itemVariants}
      exit="exit"
      className="group"
    >
      <Card
        className={`rounded-xl cursor-pointer transition-all duration-200 border-l-4 ${
          notification.isRead
            ? `border-l-muted ${config.borderClass.replace('border-l-', 'hover:border-l-')} hover:shadow-md`
            : `${config.borderClass} shadow-sm hover:shadow-md`
        } ${!notification.isRead ? 'bg-muted/30 dark:bg-muted/20' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`${notification.isRead ? 'Read' : 'Unread'} notification: ${notification.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Icon */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bgClass} transition-transform duration-200 group-hover:scale-110`}
            >
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-semibold truncate ${
                        notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-teal-500 animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${config.bgClass} ${config.iconColor} border-0`}
                  >
                    {config.label}
                  </Badge>
                </div>
              </div>
              <p
                className={`text-sm leading-relaxed ${
                  notification.isRead ? 'text-muted-foreground/80' : 'text-muted-foreground'
                }`}
              >
                {notification.message}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[11px] text-muted-foreground/60">
                  {timeAgo(notification.createdAt)}
                </span>
                <span className="text-[11px] text-muted-foreground/40">
                  {formatFullDate(notification.createdAt)}
                </span>
                {notification.isRead ? (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                    <MailOpen className="h-3 w-3" />
                    Read
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                    <Mail className="h-3 w-3" />
                    Unread
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function NotificationsPage() {
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [markingAll, setMarkingAll] = useState(false)
  const [markingReadIds, setMarkingReadIds] = useState<Set<string>>(new Set())

  // ─── Fetch notifications ─────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await notificationsApi.list(user.id)
      // Handle both array and { notifications: [...] } response formats
      const list: Notification[] = Array.isArray(res)
        ? res
        : (res as any).notifications || []
      setNotifications(list)
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ─── Mark single as read ─────────────────────────────────────────────────

  const handleMarkRead = async (id: string) => {
    if (markingReadIds.has(id)) return
    setMarkingReadIds((prev) => new Set(prev).add(id))

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )

    try {
      await notificationsApi.markRead(id)
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      )
      toast.error('Failed to mark notification as read')
    } finally {
      setMarkingReadIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // ─── Mark all as read ────────────────────────────────────────────────────

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
    if (unreadIds.length === 0) return

    setMarkingAll(true)

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    )

    try {
      await Promise.all(unreadIds.map((id) => notificationsApi.markRead(id)))
      toast.success(`Marked ${unreadIds.length} notification${unreadIds.length > 1 ? 's' : ''} as read`)
    } catch {
      // Revert: re-fetch for accuracy
      fetchNotifications()
      toast.error('Failed to mark all as read')
    } finally {
      setMarkingAll(false)
    }
  }

  // ─── Computed values ─────────────────────────────────────────────────────

  const totalCount = notifications.length
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const readCount = notifications.filter((n) => n.isRead).length

  const filteredNotifications = notifications.filter((n) => {
    if (readFilter === 'unread' && n.isRead) return false
    if (readFilter === 'read' && !n.isRead) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  const hasFilters = readFilter !== 'all' || typeFilter !== 'all'

  // ─── Stats cards ─────────────────────────────────────────────────────────

  const statsCards = [
    {
      title: 'Total',
      value: totalCount,
      icon: Bell,
      bgClass: 'bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      title: 'Unread',
      value: unreadCount,
      icon: Mail,
      bgClass: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Read',
      value: readCount,
      icon: MailOpen,
      bgClass: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return <NotificationsSkeleton />
  }

  // ─── Error state ─────────────────────────────────────────────────────────

  if (error && notifications.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Failed to Load Notifications</h3>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchNotifications} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated with alerts, survey activity, and system messages
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statsCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            custom={i}
            variants={statCardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bgClass}`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters & Bulk Actions */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filters:</span>
              </div>

              {/* Read status filter buttons */}
              <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
                {([
                  { key: 'all' as ReadFilter, label: 'All' },
                  { key: 'unread' as ReadFilter, label: 'Unread' },
                  { key: 'read' as ReadFilter, label: 'Read' },
                ]).map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setReadFilter(filter.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      readFilter === filter.key
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-pressed={readFilter === filter.key}
                  >
                    {filter.label}
                    {filter.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right: Bulk Actions */}
            <div className="flex items-center gap-2">
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReadFilter('all')
                    setTypeFilter('all')
                  }}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || markingAll}
                className="gap-2"
              >
                <CheckCheck className={`h-4 w-4 ${markingAll ? 'animate-pulse' : ''}`} />
                {markingAll ? 'Marking...' : 'Mark All as Read'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results summary */}
      {filteredNotifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center py-2"
        >
          <p className="text-xs text-muted-foreground">
            Showing {filteredNotifications.length} of {totalCount} notification{totalCount !== 1 ? 's' : ''}
            {hasFilters && ' (filtered)'}
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default NotificationsPage
