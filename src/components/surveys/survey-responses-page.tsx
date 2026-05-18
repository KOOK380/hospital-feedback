'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Star,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  TrendingUp,
  Filter,
  Quote,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/stores'
import { surveysApi, departmentsApi } from '@/lib/api'

interface SurveyData {
  id: string
  title: string
  description?: string
  type: string
  questions?: any[]
}

interface ResponseAnswer {
  id: string
  questionId: string
  answerText?: string | null
  answerNumber?: number | null
  answerChoice?: string | null
  question?: {
    id: string
    questionText: string
    questionType: string
    category?: string
  }
}

interface ResponseData {
  id: string
  surveyId: string
  respondentId?: string | null
  departmentId?: string | null
  status: string
  isAnonymous: boolean
  overallRating?: number | null
  submittedAt: string
  answers?: ResponseAnswer[]
  respondent?: {
    id: string
    name: string
    email: string
  }
}

interface Department {
  id: string
  name: string
  code: string
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

export function SurveyResponsesPage() {
  const { setActivePage, setSelectedSurveyId, selectedSurveyId } = useAppStore()

  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])

  // Filters
  const [filterDept, setFilterDept] = useState('all')
  const [filterRatingMin, setFilterRatingMin] = useState('any')
  const [filterRatingMax, setFilterRatingMax] = useState('any')

  // Detail view
  const [selectedResponse, setSelectedResponse] = useState<ResponseData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const limit = 10

  const fetchSurvey = useCallback(async () => {
    if (!selectedSurveyId) return
    try {
      const res: any = await surveysApi.get(selectedSurveyId)
      setSurvey(res.survey || res)
    } catch (err) {
      console.error('Failed to load survey:', err)
    }
  }, [selectedSurveyId])

  const fetchResponses = useCallback(async () => {
    if (!selectedSurveyId) return
    setLoading(true)
    try {
      const res: any = await surveysApi.responses(selectedSurveyId, page, limit)
      const data = res.data || res.responses || []
      const pagination = res.pagination || {}
      setResponses(Array.isArray(data) ? data : [])
      setTotal(pagination.total || res.total || 0)
      setTotalPages(pagination.totalPages || res.totalPages || 1)
    } catch (err) {
      console.error('Failed to fetch responses:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedSurveyId, page])

  const fetchDepartments = useCallback(async () => {
    try {
      const res: any = await departmentsApi.list()
      const list = Array.isArray(res) ? res : res.departments || []
      setDepartments(list)
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }, [])

  useEffect(() => {
    fetchSurvey()
    fetchDepartments()
  }, [fetchSurvey, fetchDepartments])

  useEffect(() => {
    fetchResponses()
  }, [fetchResponses])

  const handleViewDetails = (response: ResponseData) => {
    setSelectedResponse(response)
    setDetailOpen(true)
  }

  const handleBack = () => {
    setSelectedSurveyId(null)
    setActivePage('surveys')
  }

  // Compute summary stats
  const ratedResponses = responses.filter((r) => r.overallRating)
  const avgRating = ratedResponses.length > 0
    ? ratedResponses.reduce((sum, r) => sum + r.overallRating!, 0) / ratedResponses.length
    : 0
  const completedCount = responses.filter((r) => r.status === 'COMPLETED').length
  const completionRate = responses.length > 0 ? (completedCount / responses.length) * 100 : 0

  // Filter responses client-side for department and rating
  const filteredResponses = responses.filter((r) => {
    if (filterDept !== 'all' && r.departmentId !== filterDept) return false
    if (filterRatingMin && filterRatingMin !== 'any' && (r.overallRating || 0) < Number(filterRatingMin)) return false
    if (filterRatingMax && filterRatingMax !== 'any' && (r.overallRating || 0) > Number(filterRatingMax)) return false
    return true
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDeptName = (deptId?: string | null) => {
    if (!deptId) return '—'
    const dept = departments.find((d) => d.id === deptId)
    return dept?.name || deptId
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {survey?.title || 'Survey Responses'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} total response{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{avgRating?.toFixed(1) ?? '0.0'}</span>
                    <StarRating rating={avgRating} size="sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <Users className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Responses</p>
                  <span className="text-2xl font-bold">{total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                  <TrendingUp className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <span className="text-2xl font-bold">{completionRate.toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
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
            <div className="space-y-1.5">
              <Label className="text-xs">Min Rating</Label>
              <Select value={filterRatingMin} onValueChange={setFilterRatingMin}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Rating</Label>
              <Select value={filterRatingMax} onValueChange={setFilterRatingMax}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r} or less
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            Responses
            <Badge variant="secondary" className="ml-auto">
              {filteredResponses.length} shown
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No responses found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Overall Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Respondent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredResponses.map((response, idx) => (
                        <motion.tr
                          key={response.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-medium text-muted-foreground">
                            {(page - 1) * limit + idx + 1}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(response.submittedAt)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getDeptName(response.departmentId)}
                          </TableCell>
                          <TableCell>
                            {response.overallRating ? (
                              <div className="flex items-center gap-2">
                                <StarRating rating={response.overallRating} size="sm" />
                                <span className="text-xs font-medium">
                                  {response.overallRating?.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                response.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                                  : response.status === 'PARTIAL'
                                  ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                              }
                            >
                              {response.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {response.isAnonymous ? (
                              <span className="text-muted-foreground italic">Anonymous</span>
                            ) : response.respondent ? (
                              response.respondent.name
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(response)}
                              className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Response Detail - using Sheet for desktop-like drawer experience */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Response Details</SheetTitle>
          </SheetHeader>
          {selectedResponse && (
            <div className="space-y-6 mt-6">
              {/* Meta Info */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">{formatDate(selectedResponse.submittedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{getDeptName(selectedResponse.departmentId)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    className={
                      selectedResponse.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }
                  >
                    {selectedResponse.status}
                  </Badge>
                </div>
                {selectedResponse.overallRating && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Overall Rating</span>
                    <div className="flex items-center gap-2">
                      <StarRating rating={selectedResponse.overallRating} />
                      <span className="font-medium">
                        {selectedResponse.overallRating?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
                {selectedResponse.isAnonymous && (
                  <div className="bg-muted/50 px-3 py-2 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    This response was submitted anonymously
                  </div>
                )}
              </div>

              <Separator />

              {/* Answers */}
              {selectedResponse.answers && selectedResponse.answers.length > 0 ? (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Answers
                  </h3>
                  {selectedResponse.answers.map((answer, idx) => (
                    <div key={answer.id} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-emerald-600 mt-0.5">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {answer.question?.questionText || 'Unknown Question'}
                          </p>
                          {answer.question?.category && (
                            <span className="text-xs text-muted-foreground">
                              {answer.question.category}
                            </span>
                          )}

                          {/* Answer display based on type */}
                          <div className="mt-2">
                            {answer.question?.questionType === 'STAR_RATING' &&
                              answer.answerNumber && (
                                <div className="flex items-center gap-2">
                                  <StarRating rating={answer.answerNumber} />
                                  <span className="text-sm font-medium text-amber-600">
                                    {answer.answerNumber}/5
                                  </span>
                                </div>
                              )}
                            {answer.question?.questionType === 'TEXT' && answer.answerText && (
                              <div className="bg-muted/50 px-3 py-2 rounded-lg text-sm italic flex items-start gap-2">
                                <Quote className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                                {answer.answerText}
                              </div>
                            )}
                            {answer.question?.questionType === 'MULTIPLE_CHOICE' &&
                              answer.answerChoice && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300">
                                  {answer.answerChoice}
                                </Badge>
                              )}
                            {answer.question?.questionType === 'YES_NO' && answer.answerChoice && (
                              <Badge
                                className={
                                  answer.answerChoice === 'Yes'
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300'
                                }
                              >
                                {answer.answerChoice}
                              </Badge>
                            )}
                            {answer.question?.questionType === 'DROPDOWN' &&
                              answer.answerChoice && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300">
                                  {answer.answerChoice}
                                </Badge>
                              )}
                            {!answer.answerNumber && !answer.answerText && !answer.answerChoice && (
                              <span className="text-xs text-muted-foreground italic">
                                No answer provided
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {idx < selectedResponse.answers!.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No answer details available
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
