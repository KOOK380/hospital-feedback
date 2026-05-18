'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Building2,
  Users,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Trash2,
  RefreshCw,
  XCircle,
  Hash,
  UserCircle,
  Building,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { departmentsApi, usersApi } from '@/lib/api'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DepartmentHead {
  id: string
  name: string
  email: string
}

interface Department {
  id: string
  name: string
  code: string
  description?: string
  headId?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
    surveys: number
  }
  head?: DepartmentHead | null
}

interface User {
  id: string
  name: string
  email: string
  departmentId?: string | null
  role?: {
    displayName: string
  }
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

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

// ─── Department Form Dialog ──────────────────────────────────────────────────

function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
  users,
  onSave,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: Department | null
  users: User[]
  onSave: (data: {
    name: string
    code: string
    description: string
    headId: string
    isActive: boolean
  }) => void
  saving: boolean
}) {
  // Use props as initial state; parent uses key prop to force remount
  const [name, setName] = useState(department?.name || '')
  const [code, setCode] = useState(department?.code || '')
  const [description, setDescription] = useState(department?.description || '')
  const [headId, setHeadId] = useState(department?.headId || '')
  const [isActive, setIsActive] = useState(department?.isActive ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, code, description, headId, isActive })
  }

  const isEditing = !!department

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
              <Building2 className="h-4 w-4 text-teal-600" />
            </div>
            {isEditing ? 'Edit Department' : 'Create Department'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update department information and settings.'
              : 'Add a new department to the hospital system.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="dept-name" className="text-sm font-medium">
              Department Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dept-name"
              placeholder="e.g., Emergency Medicine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="transition-colors"
            />
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="dept-code" className="text-sm font-medium">
              Department Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dept-code"
              placeholder="e.g., EM"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={10}
              className="transition-colors uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Short unique identifier (max 10 characters)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="dept-desc" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="dept-desc"
              placeholder="Brief description of the department..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="transition-colors resize-none"
            />
          </div>

          {/* Department Head */}
          <div className="space-y-2">
            <Label htmlFor="dept-head" className="text-sm font-medium">
              Department Head
            </Label>
            <Select value={headId} onValueChange={setHeadId}>
              <SelectTrigger id="dept-head" className="w-full">
                <SelectValue placeholder="Select a department head" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">({user.email})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Inactive departments are hidden from most views
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim() || !code.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2 min-w-[120px]"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Stats Card Component ────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  gradient,
  sub,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  iconBg: string
  iconColor: string
  gradient: string
  sub?: string
}) {
  return (
    <Card
      className={`overflow-hidden rounded-xl border-0 bg-gradient-to-br ${gradient} shadow-sm backdrop-blur`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Main Departments Page Component ─────────────────────────────────────────

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [deptRes, userRes] = await Promise.all([
        departmentsApi.list(true),
        usersApi.list(),
      ])
      // Handle both array and object response formats
      const deptList = Array.isArray(deptRes) ? deptRes : (deptRes as any).departments || []
      const userList = Array.isArray(userRes) ? userRes : (userRes as any).users || []
      setDepartments(deptList)
      setUsers(userList)
    } catch (err: any) {
      setError(err.message || 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCreate = async (data: {
    name: string
    code: string
    description: string
    headId: string
    isActive: boolean
  }) => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        code: data.code.trim(),
        description: data.description.trim() || undefined,
        isActive: data.isActive,
      }
      if (data.headId) payload.headId = data.headId

      const res: any = await departmentsApi.create(payload)
      const newDept = res.department || res
      setDepartments((prev) => [...prev, newDept])
      setCreateOpen(false)
      toast.success('Department created', {
        description: `${data.name} has been added successfully.`,
      })
    } catch (err: any) {
      toast.error('Failed to create department', {
        description: err.message || 'An unexpected error occurred.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: {
    name: string
    code: string
    description: string
    headId: string
    isActive: boolean
  }) => {
    if (!editDept) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        code: data.code.trim(),
        description: data.description.trim() || undefined,
        headId: data.headId || null,
        isActive: data.isActive,
      }
      const res: any = await departmentsApi.update(editDept.id, payload)
      const updated = res.department || res
      setDepartments((prev) => prev.map((d) => (d.id === editDept.id ? { ...d, ...updated } : d)))
      setEditDept(null)
      toast.success('Department updated', {
        description: `${data.name} has been updated successfully.`,
      })
    } catch (err: any) {
      toast.error('Failed to update department', {
        description: err.message || 'An unexpected error occurred.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await departmentsApi.delete(deleteId)
      setDepartments((prev) => prev.filter((d) => d.id !== deleteId))
      setDeleteId(null)
      toast.success('Department deleted', {
        description: 'The department has been removed successfully.',
      })
    } catch (err: any) {
      toast.error('Failed to delete department', {
        description: err.message || 'An unexpected error occurred.',
      })
      setDeleteId(null)
    }
  }

  const handleToggleActive = async (dept: Department) => {
    setTogglingId(dept.id)
    try {
      const res: any = await departmentsApi.update(dept.id, { isActive: !dept.isActive })
      const updated = res.department || res
      setDepartments((prev) =>
        prev.map((d) => (d.id === dept.id ? { ...d, ...updated } : d))
      )
      toast.success(dept.isActive ? 'Department deactivated' : 'Department activated', {
        description: `${dept.name} is now ${dept.isActive ? 'inactive' : 'active'}.`,
      })
    } catch (err: any) {
      toast.error('Failed to update department status', {
        description: err.message || 'An unexpected error occurred.',
      })
    } finally {
      setTogglingId(null)
    }
  }

  // ─── Computed values ────────────────────────────────────────────────────

  const filteredDepartments = departments.filter((d) => {
    const matchesSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && d.isActive) ||
      (statusFilter === 'inactive' && !d.isActive)
    return matchesSearch && matchesStatus
  })

  const totalDepts = departments.length
  const activeDepts = departments.filter((d) => d.isActive).length
  const inactiveDepts = departments.filter((d) => !d.isActive).length
  const totalUsers = departments.reduce((sum, d) => sum + (d._count?.users || 0), 0)

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <StatsSkeleton />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-72" />
        </div>
        <CardGridSkeleton />
      </div>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────────

  if (error && departments.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Failed to Load Departments</h3>
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

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Manage hospital departments and their settings
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => setCreateOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Departments"
            value={totalDepts}
            icon={Building2}
            iconBg="bg-teal-500/15"
            iconColor="text-teal-600"
            gradient="from-teal-500/10 to-teal-600/5"
            sub="All registered departments"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active"
            value={activeDepts}
            icon={ToggleRight}
            iconBg="bg-emerald-500/15"
            iconColor="text-emerald-600"
            gradient="from-emerald-500/10 to-emerald-600/5"
            sub="Currently operational"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Inactive"
            value={inactiveDepts}
            icon={ToggleLeft}
            iconBg="bg-amber-500/15"
            iconColor="text-amber-600"
            gradient="from-amber-500/10 to-amber-600/5"
            sub="Temporarily disabled"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Users"
            value={totalUsers}
            icon={Users}
            iconBg="bg-purple-500/15"
            iconColor="text-purple-600"
            gradient="from-purple-500/10 to-purple-600/5"
            sub="Across all departments"
          />
        </motion.div>
      </motion.div>

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={
                statusFilter === status
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'text-muted-foreground'
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* ─── Department Cards Grid ────────────────────────────────────────── */}
      {filteredDepartments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-24 h-24 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-6">
            <Building2 className="h-12 w-12 text-teal-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {search || statusFilter !== 'all'
              ? 'No matching departments'
              : 'No departments yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first department'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredDepartments.map((dept, index) => (
              <motion.div
                key={dept.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                layout
              >
                <Card
                  className={`overflow-hidden hover:shadow-md transition-all h-full flex flex-col ${
                    !dept.isActive ? 'opacity-70' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base truncate">{dept.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-xs font-mono bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800"
                          >
                            <Hash className="h-3 w-3 mr-0.5" />
                            {dept.code}
                          </Badge>
                          <Badge
                            className={
                              dept.isActive
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                            }
                          >
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={dept.isActive}
                        onCheckedChange={() => handleToggleActive(dept)}
                        disabled={togglingId === dept.id}
                        className="shrink-0"
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    {/* Description */}
                    {dept.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {dept.description}
                      </p>
                    )}
                    {!dept.description && <div className="mb-4" />}

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Department Head */}
                      <div className="flex items-center gap-2">
                        {dept.head ? (
                          <>
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-teal-100 text-teal-700 text-xs dark:bg-teal-900/40 dark:text-teal-300">
                                {dept.head.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{dept.head.name}</p>
                              <p className="text-[10px] text-muted-foreground">Department Head</p>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <UserCircle className="h-4 w-4" />
                            <span>No head assigned</span>
                          </div>
                        )}
                      </div>

                      {/* Users count */}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground justify-end">
                        <Users className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs">
                          {dept._count?.users || 0} user{(dept._count?.users || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Surveys count */}
                    {dept._count?.surveys !== undefined && (
                      <div className="text-xs text-muted-foreground mb-3">
                        <Building className="h-3.5 w-3.5 inline mr-1 text-teal-500" />
                        {dept._count.surveys} survey{dept._count.surveys !== 1 ? 's' : ''} linked
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-2 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditDept(dept)}
                        className="gap-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(dept)}
                        disabled={togglingId === dept.id}
                        className="gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      >
                        {dept.isActive ? (
                          <>
                            <ToggleLeft className="h-3.5 w-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-3.5 w-3.5" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(dept.id)}
                        className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Create Department Dialog ──────────────────────────────────────── */}
      <DepartmentFormDialog
        key="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        users={users}
        onSave={handleCreate}
        saving={saving}
      />

      {/* ─── Edit Department Dialog ────────────────────────────────────────── */}
      <DepartmentFormDialog
        key={editDept?.id || 'edit'}
        open={!!editDept}
        onOpenChange={(open) => {
          if (!open) setEditDept(null)
        }}
        department={editDept}
        users={users}
        onSave={handleUpdate}
        saving={saving}
      />

      {/* ─── Delete Confirmation Dialog ────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              Delete Department
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {departments.find((d) => d.id === deleteId)?.name || 'this department'}
              </span>
              ? This action will deactivate the department. Existing users and surveys linked to
              this department will not be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
