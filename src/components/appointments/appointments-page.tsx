'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  CalendarDays,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  Stethoscope,
  Building2,
  FileText,
  Eye,
  XCircleIcon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { appointmentsApi, departmentsApi } from '@/lib/api'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Department {
  id: string
  name: string
  code: string
}

interface Appointment {
  id: string
  patientName: string
  patientPhone: string
  patientEmail?: string
  doctorName?: string
  departmentId: string
  appointmentDate: string
  appointmentTime?: string
  status: string
  visitType?: string
  notes?: string
  surveySent: boolean
  surveySentAt?: string
  createdAt: string
  department?: Department
}

interface CreateAppointmentData {
  patientName: string
  patientPhone: string
  patientEmail?: string
  doctorName?: string
  departmentId: string
  appointmentDate: string
  appointmentTime?: string
  status?: string
  visitType?: string
  notes?: string
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function isToday(dateStr: string): boolean {
  try {
    const date = new Date(dateStr)
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  } catch {
    return false
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'SCHEDULED':
      return (
        <Badge className="bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100">
          <Clock className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      )
    case 'COMPLETED':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    case 'CANCELLED':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      )
    case 'NO_SHOW':
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800 hover:bg-gray-100">
          <AlertTriangle className="h-3 w-3 mr-1" />
          No Show
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getVisitTypeBadge(visitType?: string) {
  if (!visitType) return <span className="text-xs text-muted-foreground">—</span>
  switch (visitType) {
    case 'OPD':
      return (
        <Badge variant="outline" className="text-xs border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300">
          OPD
        </Badge>
      )
    case 'IPD':
      return (
        <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
          IPD
        </Badge>
      )
    case 'EMERGENCY':
      return (
        <Badge variant="outline" className="text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">
          Emergency
        </Badge>
      )
    default:
      return <Badge variant="outline" className="text-xs">{visitType}</Badge>
  }
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
                <Skeleton className="h-3 w-20" />
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 9 }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, rowIdx) => (
                <TableRow key={rowIdx}>
                  {Array.from({ length: 9 }).map((_, cellIdx) => (
                    <TableCell key={cellIdx}>
                      <Skeleton className="h-4 w-full max-w-[100px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [creating, setCreating] = useState(false)

  // Create form
  const [form, setForm] = useState<CreateAppointmentData>({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    doctorName: '',
    departmentId: '',
    appointmentDate: '',
    appointmentTime: '',
    status: 'SCHEDULED',
    visitType: 'OPD',
    notes: '',
  })

  // Date picker state
  const [calendarFromOpen, setCalendarFromOpen] = useState(false)
  const [calendarToOpen, setCalendarToOpen] = useState(false)
  const [formDateOpen, setFormDateOpen] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [apptRes, deptRes] = await Promise.all([
        appointmentsApi.list(),
        departmentsApi.list(),
      ])
      // Handle both response formats: { data: [...] } and { appointments: [...] }
      const apptData = apptRes as any
      const list = apptData.data || apptData.appointments || []
      setAppointments(list)

      const deptData = deptRes as any
      setDepartments(deptData.departments || deptData.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter appointments
  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      !search ||
      a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.patientPhone.includes(search)

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter

    const matchesDept = departmentFilter === 'all' || a.departmentId === departmentFilter

    let matchesDate = true
    if (dateFrom) {
      const aDate = new Date(a.appointmentDate)
      matchesDate = matchesDate && aDate >= dateFrom
    }
    if (dateTo) {
      const aDate = new Date(a.appointmentDate)
      const toDate = new Date(dateTo)
      toDate.setDate(toDate.getDate() + 1)
      matchesDate = matchesDate && aDate < toDate
    }

    return matchesSearch && matchesStatus && matchesDept && matchesDate
  })

  // Stats
  const totalAppointments = appointments.length
  const todayAppointments = appointments.filter((a) => isToday(a.appointmentDate)).length
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED').length
  const pendingSurveys = appointments.filter(
    (a) => a.status === 'COMPLETED' && !a.surveySent
  ).length

  // Create appointment
  const handleCreate = async () => {
    if (!form.patientName.trim()) {
      toast.error('Patient name is required')
      return
    }
    if (!form.patientPhone.trim()) {
      toast.error('Patient phone is required')
      return
    }
    if (!form.departmentId) {
      toast.error('Department is required')
      return
    }
    if (!form.appointmentDate) {
      toast.error('Appointment date is required')
      return
    }

    setCreating(true)
    try {
      const res = await appointmentsApi.create({
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        patientEmail: form.patientEmail?.trim() || undefined,
        doctorName: form.doctorName?.trim() || undefined,
        departmentId: form.departmentId,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime?.trim() || undefined,
        status: form.status || 'SCHEDULED',
        visitType: form.visitType || undefined,
        notes: form.notes?.trim() || undefined,
      })

      // Add to local list
      const newAppt = (res as any).appointment || (res as any).data || res
      setAppointments((prev) => [newAppt as Appointment, ...prev])
      toast.success('Appointment created successfully')
      setCreateOpen(false)
      resetForm()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create appointment')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setForm({
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      doctorName: '',
      departmentId: '',
      appointmentDate: '',
      appointmentTime: '',
      status: 'SCHEDULED',
      visitType: 'OPD',
      notes: '',
    })
  }

  const openDetail = (appt: Appointment) => {
    setSelectedAppointment(appt)
    setDetailOpen(true)
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <StatsSkeleton />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <TableSkeleton />
      </div>
    )
  }

  // ─── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Failed to Load Appointments</h3>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchData} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Stats cards data ─────────────────────────────────────────────────────

  const statsCards = [
    {
      title: 'Total Appointments',
      value: totalAppointments,
      icon: CalendarDays,
      gradient: 'from-teal-500/10 to-teal-600/5',
      iconBg: 'bg-teal-500/15',
      iconColor: 'text-teal-600',
      sub: `${appointments.filter((a) => a.status === 'SCHEDULED').length} scheduled`,
    },
    {
      title: "Today's Appointments",
      value: todayAppointments,
      icon: Clock,
      gradient: 'from-emerald-500/10 to-emerald-600/5',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      sub: todayAppointments > 0 ? 'appointments today' : 'no appointments today',
    },
    {
      title: 'Completed',
      value: completedAppointments,
      icon: CheckCircle2,
      gradient: 'from-green-500/10 to-green-600/5',
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-600',
      sub: totalAppointments > 0
        ? `${Math.round((completedAppointments / totalAppointments) * 100)}% completion rate`
        : '0% completion rate',
    },
    {
      title: 'Pending Surveys',
      value: pendingSurveys,
      icon: FileText,
      gradient: 'from-amber-500/10 to-amber-600/5',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600',
      sub: pendingSurveys > 0 ? 'surveys not sent' : 'all surveys sent',
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient appointments and survey dispatch
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setCreateOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-3 items-center"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="NO_SHOW">No Show</SelectItem>
          </SelectContent>
        </Select>

        {/* Department Filter */}
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Popover open={calendarFromOpen} onOpenChange={setCalendarFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[150px] justify-start text-left font-normal gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(date) => {
                setDateFrom(date)
                setCalendarFromOpen(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover open={calendarToOpen} onOpenChange={setCalendarToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[150px] justify-start text-left font-normal gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(date) => {
                setDateTo(date)
                setCalendarToOpen(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {(search || statusFilter !== 'all' || departmentFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setDepartmentFilter('all')
              setDateFrom(undefined)
              setDateTo(undefined)
            }}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <XCircleIcon className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </motion.div>

      {/* Appointments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="rounded-xl">
          <CardContent className="p-0">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-6">
                  <CalendarDays className="h-12 w-12 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No appointments found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  {search || statusFilter !== 'all' || departmentFilter !== 'all' || dateFrom || dateTo
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating a new appointment'}
                </p>
                {!search && statusFilter === 'all' && !departmentFilter !== undefined && !dateFrom && !dateTo && (
                  <Button
                    onClick={() => {
                      resetForm()
                      setCreateOpen(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Appointment
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Visit Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Survey</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appt) => (
                      <TableRow key={appt.id} className="cursor-pointer" onClick={() => openDetail(appt)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10">
                              <User className="h-4 w-4 text-teal-600" />
                            </div>
                            <span className="font-medium text-sm">{appt.patientName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {appt.patientPhone}
                        </TableCell>
                        <TableCell className="text-sm">
                          {appt.doctorName || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {appt.department?.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(appt.appointmentDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {appt.appointmentTime || '—'}
                        </TableCell>
                        <TableCell>{getVisitTypeBadge(appt.visitType)}</TableCell>
                        <TableCell>{getStatusBadge(appt.status)}</TableCell>
                        <TableCell>
                          {appt.surveySent ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail(appt)
                            }}
                            className="gap-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Results count */}
      {filteredAppointments.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Showing {filteredAppointments.length} of {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ─── Create Appointment Dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                <Plus className="h-4 w-4 text-emerald-600" />
              </div>
              New Appointment
            </DialogTitle>
            <DialogDescription>
              Schedule a new patient appointment and track survey status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Patient Name */}
            <div className="grid gap-2">
              <Label htmlFor="patientName" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Patient Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="patientName"
                placeholder="Enter patient name"
                value={form.patientName}
                onChange={(e) => setForm((prev) => ({ ...prev, patientName: e.target.value }))}
              />
            </div>

            {/* Phone and Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="patientPhone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientPhone"
                  placeholder="Phone number"
                  value={form.patientPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, patientPhone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="patientEmail" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="patientEmail"
                  type="email"
                  placeholder="Email address"
                  value={form.patientEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, patientEmail: e.target.value }))}
                />
              </div>
            </div>

            {/* Doctor Name */}
            <div className="grid gap-2">
              <Label htmlFor="doctorName" className="flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                Doctor Name
              </Label>
              <Input
                id="doctorName"
                placeholder="Enter doctor name"
                value={form.doctorName}
                onChange={(e) => setForm((prev) => ({ ...prev, doctorName: e.target.value }))}
              />
            </div>

            {/* Department */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.departmentId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover open={formDateOpen} onOpenChange={setFormDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {form.appointmentDate
                        ? format(new Date(form.appointmentDate), 'MMM d, yyyy')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.appointmentDate ? new Date(form.appointmentDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setForm((prev) => ({
                            ...prev,
                            appointmentDate: date.toISOString(),
                          }))
                        }
                        setFormDateOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appointmentTime" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Time
                </Label>
                <Input
                  id="appointmentTime"
                  type="time"
                  value={form.appointmentTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Visit Type and Status row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Visit Type</Label>
                <Select
                  value={form.visitType || 'OPD'}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, visitType: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Visit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPD">OPD</SelectItem>
                    <SelectItem value="IPD">IPD</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status || 'SCHEDULED'}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Appointment Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                <CalendarDays className="h-4 w-4 text-teal-600" />
              </div>
              Appointment Details
            </DialogTitle>
            <DialogDescription>
              View full appointment information
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-2">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedAppointment.status)}
                {getVisitTypeBadge(selectedAppointment.visitType)}
              </div>

              {/* Patient Info */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Patient Information
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium">{selectedAppointment.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedAppointment.patientPhone}</span>
                  </div>
                  {selectedAppointment.patientEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedAppointment.patientEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Info */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Appointment Information
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-teal-600" />
                    <span className="text-sm">{formatDate(selectedAppointment.appointmentDate)}</span>
                  </div>
                  {selectedAppointment.appointmentTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedAppointment.appointmentTime}</span>
                    </div>
                  )}
                  {selectedAppointment.doctorName && (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">{selectedAppointment.doctorName}</span>
                    </div>
                  )}
                  {selectedAppointment.department && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedAppointment.department.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Survey Status */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Survey Status
                </h4>
                <div className="flex items-center gap-2">
                  {selectedAppointment.surveySent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Survey sent
                      </span>
                      {selectedAppointment.surveySentAt && (
                        <span className="text-xs text-muted-foreground">
                          on {formatDate(selectedAppointment.surveySentAt)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Survey not sent
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Notes
                  </h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Created date */}
              <p className="text-xs text-muted-foreground text-center">
                Created on {formatDate(selectedAppointment.createdAt)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
