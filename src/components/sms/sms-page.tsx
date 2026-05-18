'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Send,
  FileText,
  Users,
  Clock,
  Edit3,
  Trash2,
  RefreshCw,
  MessageSquare,
  Zap,
  Megaphone,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { smsApi, departmentsApi } from '@/lib/api'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsTemplate {
  id: string
  name: string
  content: string
  variables: string // JSON array string
  type: string // SURVEY | APPOINTMENT | REMINDER | CUSTOM
  category: string | null // PATIENT | EMPLOYEE
  isActive: boolean
  surveyId?: string | null
  createdAt: string
  updatedAt: string
  _count?: { logs: number }
  survey?: { id: string; title: string } | null
}

interface SmsLog {
  id: string
  templateId: string | null
  recipientName: string | null
  recipientPhone: string
  message: string
  status: string // PENDING | SENT | DELIVERED | FAILED
  provider: string | null
  providerMsgId: string | null
  sentAt: string | null
  deliveredAt: string | null
  failureReason: string | null
  retryCount: number
  departmentId: string | null
  appointmentId: string | null
  createdAt: string
  updatedAt: string
  template?: { id: string; name: string; type: string } | null
  department?: { id: string; name: string; code: string } | null
}

interface SmsCampaign {
  id: string
  name: string
  templateId: string
  type: string // MANUAL | AUTOMATED
  status: string // DRAFT | SCHEDULED | RUNNING | COMPLETED | PAUSED
  scheduleAt: string | null
  targetGroup: string | null
  targetCriteria: string
  totalSent: number
  totalDelivered: number
  totalFailed: number
  createdAt: string
  updatedAt: string
  template?: { id: string; name: string; type: string } | null
}

interface Department {
  id: string
  name: string
  code: string
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: string) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    PENDING: {
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    SENT: {
      className: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
      icon: <Send className="h-3 w-3 mr-1" />,
    },
    DELIVERED: {
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
      icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
    },
    FAILED: {
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
      icon: <XCircle className="h-3 w-3 mr-1" />,
    },
  }
  const c = config[status] || config.PENDING
  return (
    <Badge className={`${c.className} text-xs font-medium`}>
      {c.icon}
      {status}
    </Badge>
  )
}

function getTypeBadge(type: string) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    SURVEY: {
      className: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
      icon: <FileText className="h-3 w-3 mr-1" />,
    },
    APPOINTMENT: {
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
      icon: <Calendar className="h-3 w-3 mr-1" />,
    },
    REMINDER: {
      className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    CUSTOM: {
      className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
      icon: <Sparkles className="h-3 w-3 mr-1" />,
    },
  }
  const c = config[type] || config.CUSTOM
  return (
    <Badge className={`${c.className} text-xs font-medium`}>
      {c.icon}
      {type}
    </Badge>
  )
}

function getCategoryBadge(category: string | null) {
  if (!category) return null
  return (
    <Badge
      className={
        category === 'PATIENT'
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 text-xs'
          : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 text-xs'
      }
    >
      {category === 'PATIENT' ? <Users className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
      {category}
    </Badge>
  )
}

function getCampaignStatusBadge(status: string) {
  const config: Record<string, { className: string }> = {
    DRAFT: { className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700' },
    SCHEDULED: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' },
    RUNNING: { className: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800' },
    COMPLETED: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
    PAUSED: { className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' },
  }
  const c = config[status] || config.DRAFT
  return <Badge className={`${c.className} text-xs font-medium`}>{status}</Badge>
}

function highlightVariables(content: string): React.ReactNode {
  const parts = content.split(/(\{\{[^}]+\}\})/g)
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <span
          key={i}
          className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 px-1 py-0.5 rounded text-xs font-semibold"
        >
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim()))]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SmsPage() {
  const [activeTab, setActiveTab] = useState('templates')
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [logs, setLogs] = useState<SmsLog[]>([])
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLimit] = useState(10)

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    variables: '[]',
    type: 'SURVEY',
    category: 'PATIENT',
    isActive: true,
  })
  const [templateSaving, setTemplateSaving] = useState(false)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)

  // Send SMS
  const [sendForm, setSendForm] = useState({
    recipientPhone: '',
    recipientName: '',
    message: '',
    templateId: '',
    provider: 'SYSTEM',
    departmentId: '',
  })
  const [sending, setSending] = useState(false)
  const [quickSmsMode, setQuickSmsMode] = useState(false)

  // Log filters
  const [logFilters, setLogFilters] = useState({
    status: 'ALL',
    departmentId: 'ALL',
  })

  // Campaign dialog
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false)
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    templateId: '',
    type: 'MANUAL',
    targetGroup: 'ALL_PATIENTS',
    scheduleAt: '',
  })
  const [campaignSaving, setCampaignSaving] = useState(false)

  // ─── Fetch Data ───────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      const res: any = await smsApi.templates()
      const list = Array.isArray(res) ? res : res.templates || []
      setTemplates(list)
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const res: any = await departmentsApi.list()
      const list = Array.isArray(res) ? res : res.departments || []
      setDepartments(list)
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const filters: any = { page: logsPage, limit: logsLimit }
      if (logFilters.status !== 'ALL') filters.status = logFilters.status
      if (logFilters.departmentId !== 'ALL') filters.departmentId = logFilters.departmentId

      const res: any = await smsApi.logs(filters)
      // Backend returns { data, pagination } or { logs, total }
      if (res.data) {
        setLogs(res.data)
        setLogsTotal(res.pagination?.total || 0)
      } else {
        setLogs(res.logs || [])
        setLogsTotal(res.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }, [logsPage, logsLimit, logFilters])

  const fetchCampaigns = useCallback(async () => {
    // Campaigns are not yet exposed as API endpoints, show local state
    // For now we show empty state until backend campaign API is available
    setCampaigns([])
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchTemplates(), fetchDepartments(), fetchLogs(), fetchCampaigns()])
    setLoading(false)
  }, [fetchTemplates, fetchDepartments, fetchLogs, fetchCampaigns])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!loading) fetchLogs()
  }, [logsPage, logFilters, fetchLogs, loading])

  // ─── Template CRUD ────────────────────────────────────────────────────────

  const openCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      content: '',
      variables: '[]',
      type: 'SURVEY',
      category: 'PATIENT',
      isActive: true,
    })
    setTemplateDialogOpen(true)
  }

  const openEditTemplate = (template: SmsTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      content: template.content,
      variables: template.variables || '[]',
      type: template.type,
      category: template.category || 'PATIENT',
      isActive: template.isActive,
    })
    setTemplateDialogOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error('Name and content are required')
      return
    }
    setTemplateSaving(true)
    try {
      // Auto-extract variables from content
      const vars = extractVariables(templateForm.content)
      const data = {
        ...templateForm,
        variables: JSON.stringify(vars),
      }

      if (editingTemplate) {
        await smsApi.updateTemplate(editingTemplate.id, data)
        toast.success('Template updated successfully')
      } else {
        await smsApi.createTemplate(data)
        toast.success('Template created successfully')
      }
      setTemplateDialogOpen(false)
      fetchTemplates()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template')
    } finally {
      setTemplateSaving(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return
    try {
      await smsApi.deleteTemplate(deleteTemplateId)
      toast.success('Template deleted')
      fetchTemplates()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template')
    } finally {
      setDeleteTemplateId(null)
    }
  }

  const handleToggleActive = async (template: SmsTemplate) => {
    try {
      await smsApi.updateTemplate(template.id, { isActive: !template.isActive })
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, isActive: !t.isActive } : t))
      )
      toast.success(template.isActive ? 'Template deactivated' : 'Template activated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle template')
    }
  }

  // ─── Send SMS ─────────────────────────────────────────────────────────────

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setSendForm((prev) => ({
        ...prev,
        templateId,
        message: template.content,
      }))
    } else {
      setSendForm((prev) => ({ ...prev, templateId: '', message: '' }))
    }
  }

  const handleSendSms = async () => {
    if (!sendForm.recipientPhone.trim() || !sendForm.message.trim()) {
      toast.error('Phone number and message are required')
      return
    }
    setSending(true)
    try {
      await smsApi.send({
        recipientPhone: sendForm.recipientPhone,
        recipientName: sendForm.recipientName || undefined,
        message: sendForm.message,
        templateId: sendForm.templateId || undefined,
        provider: sendForm.provider || undefined,
        departmentId: sendForm.departmentId || undefined,
      })
      toast.success('SMS sent successfully')
      setSendForm({
        recipientPhone: '',
        recipientName: '',
        message: '',
        templateId: '',
        provider: 'SYSTEM',
        departmentId: '',
      })
      fetchLogs()
    } catch (err: any) {
      toast.error(err.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  const handleRetrySms = async (log: SmsLog) => {
    try {
      await smsApi.send({
        recipientPhone: log.recipientPhone,
        recipientName: log.recipientName || undefined,
        message: log.message,
        templateId: log.templateId || undefined,
        provider: log.provider || undefined,
        departmentId: log.departmentId || undefined,
      })
      toast.success('SMS retried')
      fetchLogs()
    } catch (err: any) {
      toast.error(err.message || 'Failed to retry SMS')
    }
  }

  // ─── Campaign ─────────────────────────────────────────────────────────────

  const handleSaveCampaign = async () => {
    if (!campaignForm.name.trim() || !campaignForm.templateId) {
      toast.error('Campaign name and template are required')
      return
    }
    setCampaignSaving(true)
    try {
      // Campaign API not available yet, just show toast
      toast.success('Campaign created (backend API pending)')
      setCampaignDialogOpen(false)
      setCampaignForm({ name: '', templateId: '', type: 'MANUAL', targetGroup: 'ALL_PATIENTS', scheduleAt: '' })
    } catch (err: any) {
      toast.error(err.message || 'Failed to create campaign')
    } finally {
      setCampaignSaving(false)
    }
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  const logsTotalPages = Math.ceil(logsTotal / logsLimit)
  const templateSearch = ''
  const filteredTemplates = templates.filter((t) => {
    if (!templateSearch) return true
    return (
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.content.toLowerCase().includes(templateSearch.toLowerCase())
    )
  })

  // ─── Loading Skeletons ────────────────────────────────────────────────────

  const TemplateSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const LogSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SMS Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage templates, send messages, and track delivery
          </p>
        </div>
        <Button
          onClick={() => {
            setActiveTab('send')
            setQuickSmsMode(true)
            setSendForm({ recipientPhone: '', recipientName: '', message: '', templateId: '', provider: 'SYSTEM', departmentId: '' })
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 self-start"
        >
          <Zap className="h-4 w-4" />
          Quick SMS
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted flex-wrap">
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Send SMS</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: SMS Templates
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="templates">
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="pl-9"
                  disabled
                />
              </div>
              <Button
                onClick={openCreateTemplate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>

            {/* Template Grid */}
            {loading ? (
              <TemplateSkeleton />
            ) : filteredTemplates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-24 h-24 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-6">
                  <FileText className="h-12 w-12 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No templates found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  Create SMS templates to quickly send standardized messages
                </p>
                <Button
                  onClick={openCreateTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {filteredTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      variants={itemVariants}
                      layout
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{template.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {getTypeBadge(template.type)}
                                {getCategoryBadge(template.category)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {template.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <Switch
                                checked={template.isActive}
                                onCheckedChange={() => handleToggleActive(template)}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                          {/* Content preview with highlighted variables */}
                          <div className="text-sm text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                            {highlightVariables(template.content)}
                          </div>
                          {/* Variables list */}
                          {(() => {
                            const vars = extractVariables(template.content)
                            if (vars.length === 0) return null
                            return (
                              <div className="mb-3">
                                <p className="text-xs text-muted-foreground mb-1">Variables:</p>
                                <div className="flex flex-wrap gap-1">
                                  {vars.map((v) => (
                                    <code key={v} className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                                      {`{{${v}}}`}
                                    </code>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}
                          {/* Stats */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-emerald-500" />
                              {template._count?.logs || 0} sent
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(template.createdAt)}
                            </span>
                          </div>
                          {/* Actions */}
                          <div className="mt-auto flex items-center gap-2 pt-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditTemplate(template)}
                              className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveTab('send')
                                setQuickSmsMode(false)
                                handleTemplateSelect(template.id)
                              }}
                              className="gap-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Use
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTemplateId(template.id)}
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
              </motion.div>
            )}
          </div>

          {/* Create/Edit Template Dialog */}
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate
                    ? 'Update the SMS template details below.'
                    : 'Create a new SMS template with variable placeholders.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Survey Invitation"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                {/* Type & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={templateForm.type}
                      onValueChange={(v) => setTemplateForm((p) => ({ ...p, type: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SURVEY">Survey</SelectItem>
                        <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                        <SelectItem value="REMINDER">Reminder</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={templateForm.category}
                      onValueChange={(v) => setTemplateForm((p) => ({ ...p, category: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PATIENT">Patient</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="template-content">Content</Label>
                  <Textarea
                    id="template-content"
                    placeholder="Hello {{name}}, please complete your survey: {{link}}"
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, content: e.target.value }))}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{{variable}}'} syntax for dynamic placeholders
                  </p>
                </div>
                {/* Auto-detected variables */}
                {templateForm.content && extractVariables(templateForm.content).length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Detected Variables</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {extractVariables(templateForm.content).map((v) => (
                        <code key={v} className="text-xs bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-2 py-1 rounded border border-teal-200 dark:border-teal-800">
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                {/* Preview */}
                {templateForm.content && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preview</Label>
                    <div className="rounded-lg border bg-muted/50 p-3 text-sm leading-relaxed">
                      {highlightVariables(templateForm.content)}
                    </div>
                  </div>
                )}
                {/* Active toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm font-medium">Active</Label>
                    <p className="text-xs text-muted-foreground">Enable this template for use</p>
                  </div>
                  <Switch
                    checked={templateForm.isActive}
                    onCheckedChange={(v) => setTemplateForm((p) => ({ ...p, isActive: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setTemplateDialogOpen(false)}
                  disabled={templateSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={templateSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {templateSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {editingTemplate ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this template? This action cannot be undone.
                  Any SMS logs using this template will still reference it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTemplate}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: Send SMS
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="send">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {quickSmsMode ? 'Quick SMS' : 'Send SMS'}
                    </CardTitle>
                    <CardDescription>
                      {quickSmsMode
                        ? 'Send a quick message without a template'
                        : 'Compose and send an SMS message'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickSmsMode(!quickSmsMode)}
                    className="gap-1.5"
                  >
                    {quickSmsMode ? (
                      <>
                        <FileText className="h-3.5 w-3.5" />
                        Use Template
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5" />
                        Quick SMS
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Template Selection (hidden in Quick SMS mode) */}
                {!quickSmsMode && (
                  <div className="space-y-2">
                    <Label>Select Template</Label>
                    <Select
                      value={sendForm.templateId}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates
                          .filter((t) => t.isActive)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <span className="flex items-center gap-2">
                                {t.name}
                                <span className="text-xs text-muted-foreground">({t.type})</span>
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Recipient Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Phone Number *
                      </span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="+91 9876543210"
                      value={sendForm.recipientPhone}
                      onChange={(e) => setSendForm((p) => ({ ...p, recipientPhone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-name">Recipient Name</Label>
                    <Input
                      id="recipient-name"
                      placeholder="John Doe"
                      value={sendForm.recipientName}
                      onChange={(e) => setSendForm((p) => ({ ...p, recipientName: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message">Message *</Label>
                    <span className="text-xs text-muted-foreground">
                      {sendForm.message.length} chars
                    </span>
                  </div>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={sendForm.message}
                    onChange={(e) => setSendForm((p) => ({ ...p, message: e.target.value }))}
                    rows={5}
                  />
                  {/* Variable hint when using template */}
                  {sendForm.templateId && (() => {
                    const vars = extractVariables(sendForm.message)
                    if (vars.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">Variables:</span>
                        {vars.map((v) => (
                          <code key={v} className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                            {`{{${v}}}`}
                          </code>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Provider & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={sendForm.provider}
                      onValueChange={(v) => setSendForm((p) => ({ ...p, provider: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SYSTEM">System Default</SelectItem>
                        <SelectItem value="TWILIO">Twilio</SelectItem>
                        <SelectItem value="MSG91">MSG91</SelectItem>
                        <SelectItem value="TEXTLOCAL">TextLocal</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department (optional)</Label>
                    <Select
                      value={sendForm.departmentId}
                      onValueChange={(v) => setSendForm((p) => ({ ...p, departmentId: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Message Preview */}
                {sendForm.message && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preview</Label>
                    <div className="rounded-lg border bg-muted/50 p-3 text-sm leading-relaxed max-h-32 overflow-y-auto scrollbar-thin">
                      {highlightVariables(sendForm.message)}
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleSendSms}
                    disabled={sending || !sendForm.recipientPhone.trim() || !sendForm.message.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send SMS
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: SMS Logs
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="logs">
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm shrink-0">Status:</Label>
                    <Select
                      value={logFilters.status}
                      onValueChange={(v) => {
                        setLogFilters((p) => ({ ...p, status: v }))
                        setLogsPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm shrink-0">Dept:</Label>
                    <Select
                      value={logFilters.departmentId}
                      onValueChange={(v) => {
                        setLogFilters((p) => ({ ...p, departmentId: v }))
                        setLogsPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Departments</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchLogs}
                    className="gap-1.5 ml-auto"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <LogSkeleton />
                </CardContent>
              </Card>
            ) : logs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-4">
                      <MessageSquare className="h-10 w-10 text-teal-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No SMS logs found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {logFilters.status !== 'ALL' || logFilters.departmentId !== 'ALL'
                        ? 'Try adjusting your filters'
                        : 'Send your first SMS to see logs here'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardContent className="p-0">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="max-w-[200px]">Message</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Sent At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">
                                {log.recipientName || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {log.recipientPhone}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {log.message}
                                </p>
                              </TableCell>
                              <TableCell>{getStatusBadge(log.status)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {log.provider || '—'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {log.sentAt ? formatDateTime(log.sentAt) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {log.status === 'FAILED' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRetrySms(log)}
                                      className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 h-7 px-2"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      Retry
                                    </Button>
                                  )}
                                  {log.failureReason && (
                                    <span className="text-[10px] text-red-500 dark:text-red-400 max-w-[120px] truncate" title={log.failureReason}>
                                      {log.failureReason}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y">
                      {logs.map((log) => (
                        <div key={log.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{log.recipientName || 'Unknown'}</div>
                            {getStatusBadge(log.status)}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{log.recipientPhone}</div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{log.message}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{log.provider || '—'}</span>
                              <span>{log.sentAt ? formatDateTime(log.sentAt) : '—'}</span>
                            </div>
                            {log.status === 'FAILED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetrySms(log)}
                                className="gap-1 text-amber-600 hover:text-amber-700 h-7 px-2 text-xs"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Retry
                              </Button>
                            )}
                          </div>
                          {log.failureReason && (
                            <p className="text-[10px] text-red-500 dark:text-red-400">
                              Error: {log.failureReason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Pagination */}
                {logsTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((logsPage - 1) * logsLimit) + 1}–{Math.min(logsPage * logsLimit, logsTotal)} of {logsTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logsPage <= 1}
                        onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Prev
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {logsPage} of {logsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logsPage >= logsTotalPages}
                        onClick={() => setLogsPage((p) => p + 1)}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: Campaigns
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="campaigns">
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Create and manage SMS campaigns for bulk messaging
              </p>
              <Button
                onClick={() => setCampaignDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </div>

            {/* Campaigns List */}
            {campaigns.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-4">
                      <Megaphone className="h-10 w-10 text-teal-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Create an SMS campaign to send messages to multiple recipients at once
                    </p>
                    <Button
                      onClick={() => setCampaignDialogOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Campaign
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {campaigns.map((campaign) => (
                  <motion.div key={campaign.id} variants={itemVariants}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{campaign.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1.5">
                              {getCampaignStatusBadge(campaign.status)}
                              <Badge variant="outline" className="text-xs">
                                {campaign.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center p-2 rounded-lg bg-teal-50 dark:bg-teal-950/20">
                            <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{campaign.totalSent}</p>
                            <p className="text-[10px] text-muted-foreground">Sent</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{campaign.totalDelivered}</p>
                            <p className="text-[10px] text-muted-foreground">Delivered</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                            <p className="text-lg font-bold text-red-700 dark:text-red-300">{campaign.totalFailed}</p>
                            <p className="text-[10px] text-muted-foreground">Failed</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        {campaign.totalSent > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Delivery Rate</span>
                              <span className="font-medium">
                                {Math.round(((campaign.totalDelivered) / campaign.totalSent) * 100)}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full transition-all"
                                style={{ width: `${(campaign.totalDelivered / campaign.totalSent) * 100}%` }}
                              />
                              <div
                                className="bg-teal-500 h-full transition-all"
                                style={{ width: `${((campaign.totalSent - campaign.totalDelivered - campaign.totalFailed) / campaign.totalSent) * 100}%` }}
                              />
                              <div
                                className="bg-red-500 h-full transition-all"
                                style={{ width: `${(campaign.totalFailed / campaign.totalSent) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created {formatDate(campaign.createdAt)}
                          {campaign.scheduleAt && (
                            <span> · Scheduled {formatDate(campaign.scheduleAt)}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Create Campaign Dialog */}
            <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new SMS campaign to send messages in bulk
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      placeholder="e.g., Monthly Survey Campaign"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select
                      value={campaignForm.templateId}
                      onValueChange={(v) => setCampaignForm((p) => ({ ...p, templateId: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates
                          .filter((t) => t.isActive)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.type})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={campaignForm.type}
                        onValueChange={(v) => setCampaignForm((p) => ({ ...p, type: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANUAL">Manual</SelectItem>
                          <SelectItem value="AUTOMATED">Automated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Group</Label>
                      <Select
                        value={campaignForm.targetGroup}
                        onValueChange={(v) => setCampaignForm((p) => ({ ...p, targetGroup: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL_PATIENTS">All Patients</SelectItem>
                          <SelectItem value="DEPARTMENT">Department</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {campaignForm.type === 'AUTOMATED' && (
                    <div className="space-y-2">
                      <Label htmlFor="schedule-at">Schedule At</Label>
                      <Input
                        id="schedule-at"
                        type="datetime-local"
                        value={campaignForm.scheduleAt}
                        onChange={(e) => setCampaignForm((p) => ({ ...p, scheduleAt: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCampaignDialogOpen(false)}
                    disabled={campaignSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCampaign}
                    disabled={campaignSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {campaignSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Create Campaign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
