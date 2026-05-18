'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  ClipboardList,
  Users,
  MessageSquare,
  Calendar,
  Edit3,
  Eye,
  Trash2,
  ChevronRight,
  FileText,
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Mail,
  Link2,
  Phone,
  Download,
  Shield,
  LogIn,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { useAppStore } from '@/lib/stores'
import { surveysApi } from '@/lib/api'

interface Survey {
  id: string
  title: string
  description?: string
  type: string
  isActive: boolean
  isAnonymous: boolean
  startDate?: string
  endDate?: string
  createdBy: string
  departmentId?: string
  createdAt: string
  updatedAt: string
  _count?: {
    questions: number
    responses: number
  }
  creator?: {
    id: string
    name: string
    email: string
  }
  department?: {
    id: string
    name: string
    code: string
  }
}

export function SurveysPage() {
  const { setActivePage, setSelectedSurveyId } = useAppStore()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [shareSurveyId, setShareSurveyId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [surveyBaseUrl, setSurveyBaseUrl] = useState('https://survey.hospital.com')

  useEffect(() => {
    setSurveyBaseUrl(window.location.origin)
  }, [])

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await surveysApi.list()
      const list = Array.isArray(res) ? res : res.surveys || []
      setSurveys(list)
    } catch (err) {
      console.error('Failed to fetch surveys:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const filteredSurveys = surveys.filter((s) => {
    const matchesSearch =
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
    const matchesType = typeFilter === 'all' || s.type === typeFilter.toUpperCase()
    return matchesSearch && matchesType
  })

  const handleCreate = () => {
    setSelectedSurveyId(null)
    setActivePage('survey-builder')
  }

  const handleEdit = (id: string) => {
    setSelectedSurveyId(id)
    setActivePage('survey-builder')
  }

  const handleViewResponses = (id: string) => {
    setSelectedSurveyId(id)
    setActivePage('survey-responses')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await surveysApi.delete(deleteId)
      setSurveys((prev) => prev.filter((s) => s.id !== deleteId))
    } catch (err) {
      console.error('Failed to delete survey:', err)
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggleActive = async (survey: Survey) => {
    try {
      await surveysApi.update(survey.id, { isActive: !survey.isActive })
      setSurveys((prev) =>
        prev.map((s) => (s.id === survey.id ? { ...s, isActive: !s.isActive } : s))
      )
    } catch (err) {
      console.error('Failed to toggle survey active state:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Surveys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage patient and employee satisfaction surveys
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Survey
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full sm:w-auto">
          <TabsList className="bg-muted">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="employee">Employee</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search surveys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Survey Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSurveys.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-6">
            <ClipboardList className="h-12 w-12 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No surveys found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {search || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first survey'}
          </p>
          {!search && typeFilter === 'all' && (
            <Button
              onClick={handleCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Survey
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSurveys.map((survey, index) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                layout
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base truncate">{survey.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              survey.type === 'PATIENT'
                                ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
                                : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                            }
                          >
                            {survey.type === 'PATIENT' ? (
                              <Users className="h-3 w-3 mr-1" />
                            ) : (
                              <FileText className="h-3 w-3 mr-1" />
                            )}
                            {survey.type}
                          </Badge>
                          {survey.isAnonymous ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Shield className="h-3 w-3" />
                              Anonymous
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1 border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-300">
                              <LogIn className="h-3 w-3" />
                              Login Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {survey.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          checked={survey.isActive}
                          onCheckedChange={() => handleToggleActive(survey)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {survey.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {survey.description}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{survey._count?.questions || 0} questions</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Eye className="h-3.5 w-3.5 text-amber-500" />
                        <span>{survey._count?.responses || 0} responses</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatDate(survey.createdAt)}</span>
                      </div>
                      {survey.department && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span className="truncate">{survey.department.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(survey.id)}
                        className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShareSurveyId(survey.id); setCopied(false) }}
                        className="gap-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/30"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSurveyId(survey.id)
                          setActivePage('take-survey')
                        }}
                        className="gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Take
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(survey.id)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Survey</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this survey? This action cannot be undone. All
              associated questions and responses will be preserved but the survey will be marked as
              deleted.
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

      {/* Share Survey Dialog - Redesigned */}
      <Dialog open={!!shareSurveyId} onOpenChange={(open) => { if (!open) setShareSurveyId(null) }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col">
          {/* Header with gradient background - stays at top */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
                <Share2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <DialogTitle className="text-lg font-bold text-white">
                  Share Survey
                </DialogTitle>
                <DialogDescription className="text-emerald-100 text-sm mt-0.5">
                  Share this survey with patients or employees
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
            {/* Survey Link Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Survey Link
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center rounded-lg border bg-muted/40 overflow-hidden">
                  <div className="pl-3 pr-1 py-2">
                    <Link2 className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 text-sm text-foreground truncate pr-2 font-mono">
                    {surveyBaseUrl}/s/{shareSurveyId}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    const link = `${surveyBaseUrl}/s/${shareSurveyId}`
                    try {
                      await navigator.clipboard.writeText(link)
                      setCopied(true)
                      toast.success('Link copied to clipboard!')
                      setTimeout(() => setCopied(false), 2000)
                    } catch {
                      toast.error('Failed to copy link')
                    }
                  }}
                  className={`gap-1.5 shrink-0 h-9 px-4 transition-all duration-200 ${
                    copied
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-foreground text-background hover:bg-foreground/90'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* QR Code Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                QR Code
              </label>
              <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-24 h-24 rounded-lg bg-white border shadow-sm flex items-center justify-center p-1.5">
                    <QRCodeSVG
                      value={`${surveyBaseUrl}/s/${shareSurveyId}`}
                      size={80}
                      level="M"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 gap-1 text-[11px] text-muted-foreground hover:text-foreground h-6 px-2"
                    onClick={() => {
                      const svgEl = document.querySelector('.share-qr-svg') as SVGElement | null
                      if (svgEl) {
                        const svgData = new XMLSerializer().serializeToString(svgEl)
                        const canvas = document.createElement('canvas')
                        const ctx = canvas.getContext('2d')
                        const img = new Image()
                        img.onload = () => {
                          canvas.width = img.width
                          canvas.height = img.height
                          ctx?.drawImage(img, 0, 0)
                          const a = document.createElement('a')
                          a.href = canvas.toDataURL('image/png')
                          a.download = `survey-qr-${shareSurveyId}.png`
                          a.click()
                        }
                        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
                      } else {
                        toast.info('Right-click the QR code to save it')
                      }
                    }}
                  >
                    <Download className="h-3 w-3" />
                    Save
                  </Button>
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Scan to open survey
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Scan with any phone camera to open and fill out the survey directly.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Works with any smartphone
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    No app installation needed
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Share Via Section */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Share Via
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* WhatsApp */}
                <button
                  onClick={() => {
                    const link = encodeURIComponent(`${surveyBaseUrl}/s/${shareSurveyId}`)
                    window.open(`https://wa.me/?text=Please+share+your+feedback:+${link}`, '_blank')
                  }}
                  className="flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 text-left transition-all duration-200 hover:bg-green-50 hover:border-green-200 hover:shadow-sm dark:hover:bg-green-950/20 dark:hover:border-green-800 group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors shrink-0">
                    <svg className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">WhatsApp</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Send via chat</p>
                  </div>
                </button>

                {/* Email */}
                <button
                  onClick={() => {
                    const link = `${surveyBaseUrl}/s/${shareSurveyId}`
                    window.open(
                      `mailto:?subject=Hospital%20Feedback%20Survey&body=Dear%20Recipient%2C%0A%0APlease%20share%20your%20valuable%20feedback%20by%20clicking%20the%20link%20below%3A%0A%0A${encodeURIComponent(link)}%0A%0AThank%20you%20for%20your%20time.`,
                      '_blank'
                    )
                  }}
                  className="flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 text-left transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm dark:hover:bg-blue-950/20 dark:hover:border-blue-800 group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors shrink-0">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">Email</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Send as email</p>
                  </div>
                </button>

                {/* SMS */}
                <button
                  onClick={() => {
                    const link = `${surveyBaseUrl}/s/${shareSurveyId}`
                    window.open(
                      `sms:?body=Please%20share%20your%20feedback:%20${encodeURIComponent(link)}`,
                      '_blank'
                    )
                  }}
                  className="flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 text-left transition-all duration-200 hover:bg-violet-50 hover:border-violet-200 hover:shadow-sm dark:hover:bg-violet-950/20 dark:hover:border-violet-800 group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/40 transition-colors shrink-0">
                    <Phone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">SMS</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Text message</p>
                  </div>
                </button>

                {/* Copy Link */}
                <button
                  onClick={async () => {
                    const link = `${surveyBaseUrl}/s/${shareSurveyId}`
                    try {
                      await navigator.clipboard.writeText(link)
                      setCopied(true)
                      toast.success('Link copied to clipboard!')
                      setTimeout(() => setCopied(false), 2000)
                    } catch {
                      toast.error('Failed to copy link')
                    }
                  }}
                  className="flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 text-left transition-all duration-200 hover:bg-amber-50 hover:border-amber-200 hover:shadow-sm dark:hover:bg-amber-950/20 dark:hover:border-amber-800 group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors shrink-0">
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {copied ? 'Copied!' : 'Copy Link'}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Paste anywhere</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
