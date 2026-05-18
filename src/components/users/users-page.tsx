'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Shield,
  Building2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usersApi, departmentsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Role {
  id: string
  name: string
  displayName: string
}

interface Department {
  id: string
  name: string
  code: string
}

interface User {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  isActive: boolean
  isVerified: boolean
  lastLoginAt?: string
  createdAt: string
  role: Role
  department?: Department
}

type SortField = 'name' | 'email' | 'role' | 'department' | 'status' | 'lastLoginAt'
type SortDirection = 'asc' | 'desc'

interface FormData {
  name: string
  email: string
  phone: string
  password: string
  roleId: string
  departmentId: string
  isActive: boolean
}

const emptyForm: FormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  roleId: '',
  departmentId: '',
  isActive: true,
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

// ─── Helper functions ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never'
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isNewThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

const PAGE_SIZE = 8

// ─── Main Component ──────────────────────────────────────────────────────────

export function UsersPage() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const currentUser = useAuthStore((s) => s.user)

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await usersApi.list()
      // API returns array directly, not { users: [...] }
      const userList = Array.isArray(result) ? result : (result as any).users || []
      setUsers(userList)

      // Extract unique roles from user data
      const roleMap = new Map<string, Role>()
      userList.forEach((u: User) => {
        if (u.role && !roleMap.has(u.role.id)) {
          roleMap.set(u.role.id, u.role)
        }
      })
      setRoles(Array.from(roleMap.values()))
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const result = await departmentsApi.list()
      const deptList = Array.isArray(result) ? result : (result as any).departments || []
      setDepartments(deptList.map((d: any) => ({ id: d.id, name: d.name, code: d.code })))
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [fetchUsers, fetchDepartments])

  // ─── Filtering, Sorting, Pagination ────────────────────────────────────

  const filteredUsers = useMemo(() => {
    let result = [...users]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    }

    // Role filter
    if (filterRole !== 'all') {
      result = result.filter((u) => u.role?.id === filterRole)
    }

    // Department filter
    if (filterDepartment !== 'all') {
      result = result.filter((u) => u.department?.id === filterDepartment)
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'email':
          aVal = a.email.toLowerCase()
          bVal = b.email.toLowerCase()
          break
        case 'role':
          aVal = a.role?.displayName?.toLowerCase() || ''
          bVal = b.role?.displayName?.toLowerCase() || ''
          break
        case 'department':
          aVal = a.department?.name?.toLowerCase() || 'zzz'
          bVal = b.department?.name?.toLowerCase() || 'zzz'
          break
        case 'status':
          aVal = a.isActive ? 0 : 1
          bVal = b.isActive ? 0 : 1
          break
        case 'lastLoginAt':
          aVal = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0
          bVal = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [users, searchQuery, filterRole, filterDepartment, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterRole, filterDepartment])

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.isActive).length
    const inactive = users.filter((u) => !u.isActive).length
    const newThisMonth = users.filter((u) => isNewThisMonth(u.createdAt)).length
    return { total, active, inactive, newThisMonth }
  }, [users])

  // ─── Sort handler ───────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-teal-600" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-teal-600" />
    )
  }

  // ─── Form handlers ──────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setFormData(emptyForm)
    setShowPassword(false)
    setCreateOpen(true)
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      roleId: user.role?.id || '',
      departmentId: user.department?.id || '',
      isActive: user.isActive,
    })
    setShowPassword(false)
    setEditOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteOpen(true)
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.roleId) {
      toast.error('Please fill in all required fields')
      return
    }

    setFormLoading(true)
    try {
      await usersApi.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        roleId: formData.roleId,
        departmentId: formData.departmentId || undefined,
        isActive: formData.isActive,
      })
      toast.success('User created successfully')
      setCreateOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedUser) return
    if (!formData.name.trim() || !formData.email.trim() || !formData.roleId) {
      toast.error('Please fill in all required fields')
      return
    }

    setFormLoading(true)
    try {
      const updateData: Record<string, any> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        roleId: formData.roleId,
        departmentId: formData.departmentId || null,
        isActive: formData.isActive,
      }
      if (formData.password.trim()) {
        updateData.password = formData.password.trim()
      }
      await usersApi.update(selectedUser.id, updateData)
      toast.success('User updated successfully')
      setEditOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setFormLoading(true)
    try {
      await usersApi.delete(selectedUser.id)
      toast.success('User deleted successfully')
      setDeleteOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user')
    } finally {
      setFormLoading(false)
    }
  }

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
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
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────────

  if (error && users.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Failed to Load Users</h3>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchUsers} variant="outline" className="gap-2">
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage hospital staff accounts and permissions
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="gap-2 bg-teal-600 hover:bg-teal-700">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards ─────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          {
            title: 'Total Users',
            value: stats.total,
            icon: Users,
            gradient: 'from-teal-500/10 to-teal-600/5',
            iconBg: 'bg-teal-500/15',
            iconColor: 'text-teal-600',
            sub: `${stats.active} active`,
          },
          {
            title: 'Active Users',
            value: stats.active,
            icon: UserCheck,
            gradient: 'from-emerald-500/10 to-emerald-600/5',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-600',
            sub: `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% of total`,
          },
          {
            title: 'Inactive Users',
            value: stats.inactive,
            icon: UserX,
            gradient: 'from-orange-500/10 to-orange-600/5',
            iconBg: 'bg-orange-500/15',
            iconColor: 'text-orange-600',
            sub: stats.inactive === 0 ? 'All users active' : 'Needs attention',
          },
          {
            title: 'New This Month',
            value: stats.newThisMonth,
            icon: UserPlus,
            gradient: 'from-purple-500/10 to-purple-600/5',
            iconBg: 'bg-purple-500/15',
            iconColor: 'text-purple-600',
            sub: 'Recently joined',
          },
        ].map((stat) => (
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

      {/* ─── User List ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-xl">
          <CardContent className="p-4 md:p-6">
            {/* Search & Filters */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[170px] h-9">
                    <SelectValue placeholder="All Departments" />
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
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('name')}
                    >
                      <span className="flex items-center">
                        Name
                        <SortIcon field="name" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('email')}
                    >
                      <span className="flex items-center">
                        Email
                        <SortIcon field="email" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('role')}
                    >
                      <span className="flex items-center">
                        Role
                        <SortIcon field="role" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('department')}
                    >
                      <span className="flex items-center">
                        Department
                        <SortIcon field="department" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('status')}
                    >
                      <span className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('lastLoginAt')}
                    >
                      <span className="flex items-center">
                        Last Login
                        <SortIcon field="lastLoginAt" />
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-10 w-10 text-muted-foreground/40" />
                          <p className="text-sm font-medium text-muted-foreground">
                            {searchQuery || filterRole !== 'all' || filterDepartment !== 'all'
                              ? 'No users match your filters'
                              : 'No users found'}
                          </p>
                          {(searchQuery || filterRole !== 'all' || filterDepartment !== 'all') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchQuery('')
                                setFilterRole('all')
                                setFilterDepartment('all')
                              }}
                              className="mt-1"
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                              <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-xs font-semibold">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {user.name}
                                {currentUser?.id === user.id && (
                                  <span className="ml-1.5 text-[10px] text-teal-600 font-normal">(You)</span>
                                )}
                              </p>
                              {user.phone && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {user.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[180px]">{user.email}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="gap-1 text-xs font-medium"
                          >
                            <Shield className="h-3 w-3" />
                            {user.role?.displayName || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.department ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Building2 className="h-3 w-3" />
                              {user.department.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={user.isActive ? 'default' : 'destructive'}
                                className={`text-xs ${
                                  user.isActive
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0'
                                    : ''
                                }`}
                              >
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {user.isActive ? 'User account is active' : 'User account is disabled'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(user.lastLoginAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions for {user.name}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Pencil className="h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openDeleteDialog(user)}
                                disabled={currentUser?.id === user.id}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredUsers.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of{' '}
                  {filteredUsers.length} users
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current, and adjacent pages
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      )
                    })
                    .map((page, idx, arr) => {
                      // Add ellipsis gap
                      const prevPage = arr[idx - 1]
                      const showEllipsis = prevPage && page - prevPage > 1
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-1 text-xs text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="icon"
                            className={`h-8 w-8 ${
                              currentPage === page
                                ? 'bg-teal-600 hover:bg-teal-700'
                                : ''
                            }`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                            <span className="sr-only">Page {page}</span>
                          </Button>
                        </span>
                      )
                    })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Create User Dialog ──────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                <UserPlus className="h-4 w-4 text-teal-600" />
              </div>
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new staff member to the hospital system
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="create-name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="e.g. Dr. Sarah Johnson"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="create-email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="e.g. sarah@hospital.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="create-phone">Phone Number</Label>
              <Input
                id="create-phone"
                placeholder="e.g. +1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="create-password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Role & Department */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(val) => setFormData({ ...formData, roleId: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(val) => setFormData({ ...formData, departmentId: val })}
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
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Account Status</Label>
                <p className="text-xs text-muted-foreground">
                  Activate or deactivate this account
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={formLoading}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              {formLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit User Dialog ────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                <Pencil className="h-4 w-4 text-teal-600" />
              </div>
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="edit-email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Password (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="edit-password">
                New Password{' '}
                <span className="text-xs font-normal text-muted-foreground">(leave blank to keep current)</span>
              </Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password to change"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Role & Department */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(val) => setFormData({ ...formData, roleId: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(val) => setFormData({ ...formData, departmentId: val })}
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
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Account Status</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isActive ? 'Account is currently active' : 'Account is currently disabled'}
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={formLoading}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              {formLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete User Confirmation ────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  This action will deactivate and soft-delete the user account.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-muted/50 p-3">
            {selectedUser && (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {selectedUser.avatar && <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />}
                  <AvatarFallback className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-semibold">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            The user will be marked as deleted and deactivated. This can be restored from the database if needed.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={formLoading}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {formLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
