'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Activity,
  CalendarDays,
  TrendingUp,
  Search,
  Globe,
  FileJson,
  Monitor,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { auditLogsApi, usersApi } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditLogUser {
  id: string
  name: string
  email: string
  role?: { displayName: string }
}

interface AuditLog {
  id: string
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  details: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: AuditLogUser | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UserOption {
  id: string
  name: string
  email: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_TYPES = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'] as const
const ENTITY_TYPES = ['SURVEY', 'USER', 'DEPARTMENT', 'SMS', 'REPORT'] as const
const PAGE_SIZE = 15

const ACTION_BADGE_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  UPDATE: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
  DELETE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  LOGIN: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700',
  EXPORT: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
}

const ACTION_ICONS: Record<string, string> = {
  CREATE: '+',
  UPDATE: '~',
  DELETE: '-',
  LOGIN: '→',
  LOGOUT: '←',
  EXPORT: '↓',
}

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
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFullTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return date >= startOfWeek
}

function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function parseDetails(detailsStr: string): Record<string, unknown> {
  try {
    return JSON.parse(detailsStr || '{}')
  } catch {
    return { raw: detailsStr }
  }
}

function formatJson(obj: unknown, indent = 0): string {
  return JSON.stringify(obj, null, 2)
}

// ─── Skeleton loaders ────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-0">
        <div className="space-y-0">
          <div className="flex items-center gap-4 border-b px-4 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── JSON Viewer Component ───────────────────────────────────────────────────

function JsonViewer({ data }: { data: unknown }) {
  const [collapsed, setCollapsed] = useState(false)

  const formatted = useMemo(() => formatJson(data), [data])

  if (!data || (typeof data === 'object' && Object.keys(data as Record<string, unknown>).length === 0)) {
    return <span className="text-xs text-muted-foreground italic">No details available</span>
  }

  return (
    <div className="relative">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-1 flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        {collapsed ? 'Expand JSON' : 'Collapse JSON'}
      </button>
      {!collapsed && (
        <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed scrollbar-thin font-mono">
          <code>{formatted}</code>
        </pre>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AuditLogsPage() {
  // State
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('ALL')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL')
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch users for dropdown
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await usersApi.list()
        const userList = res.users || []
        setUsers(
          userList.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }))
        )
      } catch {
        // Non-critical
      }
    }
    fetchUsers()
  }, [])

  // Fetch audit logs
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const filters: Record<string, string | number> = { page, limit: PAGE_SIZE }
      if (actionFilter && actionFilter !== 'ALL') filters.action = actionFilter
      if (entityTypeFilter && entityTypeFilter !== 'ALL') filters.entityType = entityTypeFilter
      if (selectedUserId && selectedUserId !== 'ALL') filters.userId = selectedUserId
      if (startDate) filters.startDate = new Date(startDate).toISOString()
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filters.endDate = end.toISOString()
      }

      const result = await auditLogsApi.list(filters)
      const logData = (result as any).data || (result as any).logs || []
      const pag = (result as any).pagination || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 }

      setLogs(Array.isArray(logData) ? logData : [])
      setPagination(pag)
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [actionFilter, entityTypeFilter, selectedUserId, startDate, endDate])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  // Stats
  const stats = useMemo(() => {
    const todayCount = logs.filter((l) => isToday(l.createdAt)).length
    const weekCount = logs.filter((l) => isThisWeek(l.createdAt)).length
    const monthCount = logs.filter((l) => isThisMonth(l.createdAt)).length

    // Most active user from current page
    const userCounts: Record<string, { name: string; count: number }> = {}
    logs.forEach((l) => {
      if (l.user) {
        const key = l.user.id
        if (!userCounts[key]) userCounts[key] = { name: l.user.name, count: 0 }
        userCounts[key].count++
      }
    })
    const mostActive = Object.values(userCounts).sort((a, b) => b.count - a.count)[0]

    return { todayCount, weekCount, monthCount, mostActive }
  }, [logs])

  const hasActiveFilters = actionFilter !== 'ALL' || entityTypeFilter !== 'ALL' || selectedUserId !== 'ALL' || startDate || endDate || userSearch

  const clearFilters = () => {
    setActionFilter('ALL')
    setEntityTypeFilter('ALL')
    setSelectedUserId('ALL')
    setStartDate('')
    setEndDate('')
    setUserSearch('')
  }

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users
    const q = userSearch.toLowerCase()
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, userSearch])

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <StatsSkeleton />
        <TableSkeleton />
      </div>
    )
  }

  // ─── Error state ──────────────────────────────────────────────────────────

  if (error && logs.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldCheck className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Failed to Load Audit Logs</h3>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchLogs(1)} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track all system activities and user actions
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 ${showFilters ? 'border-teal-500 text-teal-600 dark:text-teal-400' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                !
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards ──────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden rounded-xl border-0 bg-gradient-to-br from-teal-500/10 to-teal-600/5 shadow-sm backdrop-blur">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Actions Today</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.todayCount}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15">
                  <Clock className="h-5 w-5 text-teal-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Recorded today</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden rounded-xl border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-sm backdrop-blur">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">This Week</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.weekCount}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                  <CalendarDays className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Past 7 days</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden rounded-xl border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm backdrop-blur">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.monthCount}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Current month total</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden rounded-xl border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-sm backdrop-blur">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Most Active</p>
                  <p className="text-lg font-bold tracking-tight truncate max-w-[140px]">
                    {stats.mostActive?.name || 'System'}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.mostActive ? `${stats.mostActive.count} actions on this page` : 'No user activity'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── Filters Section ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="rounded-xl">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {/* Action Type Filter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Action Type</label>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Actions</SelectItem>
                        {ACTION_TYPES.map((action) => (
                          <SelectItem key={action} value={action}>
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Entity Type Filter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
                    <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Entities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Entities</SelectItem>
                        {ENTITY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* User Filter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">User</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Users</SelectItem>
                        {filteredUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">From Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">To Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Clear Filters */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-transparent">Action</label>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      className="w-full gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* User Search (separate row for clarity) */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="h-9 pl-9"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Logs Table ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="rounded-xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                  <Activity className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Activity Log</CardTitle>
                  <CardDescription>
                    {pagination.total} total record{pagination.total !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 && !loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="text-center">
                  <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No audit logs found</p>
                  <p className="text-xs text-muted-foreground/70">
                    {hasActiveFilters ? 'Try adjusting your filters' : 'Activity will appear here when actions are performed'}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[160px]">User</TableHead>
                    <TableHead className="w-[110px]">Action</TableHead>
                    <TableHead className="w-[120px]">Entity Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[130px]">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isExpanded = expandedRow === log.id
                    const details = parseDetails(log.details)
                    const actionStyle = ACTION_BADGE_STYLES[log.action] || ACTION_BADGE_STYLES.UPDATE
                    const actionIcon = ACTION_ICONS[log.action] || '•'

                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      >
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{formatTimestamp(log.createdAt)}</p>
                            <p className="text-[10px] text-muted-foreground">{formatFullTimestamp(log.createdAt)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {log.user ? log.user.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {log.user?.name || 'System'}
                              </p>
                              {log.user?.email && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {log.user.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 text-[11px] font-semibold ${actionStyle}`}
                          >
                            <span className="text-[9px] font-bold">{actionIcon}</span>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {log.entityType || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileJson className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {Object.keys(details).length > 0
                                ? `${Object.keys(details).length} field${Object.keys(details).length !== 1 ? 's' : ''} changed`
                                : 'No details'}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-mono">
                              {log.ipAddress || '—'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Expanded Detail Panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {expandedRow && (() => {
          const log = logs.find((l) => l.id === expandedRow)
          if (!log) return null
          const details = parseDetails(log.details)

          return (
            <motion.div
              key="detail-panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-xl border-teal-200 dark:border-teal-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                        <FileJson className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Log Details</CardTitle>
                        <CardDescription>
                          Full information for this audit record
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRow(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Row */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Action</p>
                      <Badge
                        variant="outline"
                        className={`mt-1 gap-1 text-[11px] font-semibold ${ACTION_BADGE_STYLES[log.action] || ACTION_BADGE_STYLES.UPDATE}`}
                      >
                        {log.action}
                      </Badge>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Entity</p>
                      <p className="mt-1 text-sm font-medium">{log.entityType || 'System'}</p>
                      {log.entityId && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{log.entityId}</p>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">User</p>
                      <p className="mt-1 text-sm font-medium">{log.user?.name || 'System'}</p>
                      {log.user?.email && (
                        <p className="text-[10px] text-muted-foreground">{log.user.email}</p>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Timestamp</p>
                      <p className="mt-1 text-sm font-medium">{formatFullTimestamp(log.createdAt)}</p>
                    </div>
                  </div>

                  {/* Change Details */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold flex items-center gap-1.5">
                      <FileJson className="h-3.5 w-3.5 text-teal-600" />
                      Change Details
                    </h4>
                    <JsonViewer data={details} />
                  </div>

                  {/* Technical Info */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-teal-600" />
                      Technical Information
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">IP Address</p>
                        <p className="mt-1 text-sm font-mono">{log.ipAddress || 'Not recorded'}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">User Agent</p>
                        <p className="mt-1 text-xs font-mono break-all leading-relaxed">
                          {log.userAgent || 'Not recorded'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Log ID */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground">Log ID:</span>
                    <code className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {log.id}
                    </code>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ─── Pagination ───────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(1)}
                disabled={pagination.page <= 1 || loading}
                className="h-8 w-8 p-0"
              >
                <span className="text-xs">«</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                Prev
              </Button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => fetchLogs(pageNum)}
                    disabled={loading}
                    className={`h-8 w-8 p-0 ${
                      pageNum === pagination.page ? 'bg-teal-600 hover:bg-teal-700' : ''
                    }`}
                  >
                    {pageNum}
                  </Button>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="h-8 gap-1"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="h-8 w-8 p-0"
              >
                <span className="text-xs">»</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default AuditLogsPage
