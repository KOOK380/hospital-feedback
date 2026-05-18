'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  X,
  Eye,
  Star,
  Type,
  List,
  CheckCircle2,
  ChevronDown as ChevronDownIcon,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/stores'
import { surveysApi, departmentsApi } from '@/lib/api'

const QUESTION_TYPES = [
  { value: 'STAR_RATING', label: 'Star Rating', icon: Star, color: 'text-amber-500' },
  { value: 'TEXT', label: 'Text Answer', icon: Type, color: 'text-emerald-500' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: List, color: 'text-purple-500' },
  { value: 'YES_NO', label: 'Yes / No', icon: CheckCircle2, color: 'text-teal-500' },
  { value: 'DROPDOWN', label: 'Dropdown', icon: ChevronDownIcon, color: 'text-orange-500' },
] as const

interface QuestionForm {
  id: string
  questionText: string
  questionType: string
  options: string[]
  category: string
  isRequired: boolean
  order: number
}

interface Department {
  id: string
  name: string
  code: string
}

function generateId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function createEmptyQuestion(order: number): QuestionForm {
  return {
    id: generateId(),
    questionText: '',
    questionType: 'STAR_RATING',
    options: [],
    category: '',
    isRequired: true,
    order,
  }
}

export function SurveyBuilderPage() {
  const { setActivePage, setSelectedSurveyId, selectedSurveyId } = useAppStore()

  // Survey settings
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('PATIENT')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [departmentId, setDepartmentId] = useState('none')

  // Questions
  const [questions, setQuestions] = useState<QuestionForm[]>([createEmptyQuestion(0)])

  // UI state
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')

  // Fetch departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res: any = await departmentsApi.list()
        const list = Array.isArray(res) ? res : res.departments || []
        setDepartments(list.filter((d: any) => d.isActive !== false))
      } catch (err) {
        console.error('Failed to fetch departments:', err)
      }
    }
    fetchDepts()
  }, [])

  // Load survey for editing
  const loadSurvey = useCallback(async () => {
    if (!selectedSurveyId) return
    setLoading(true)
    try {
      const res: any = await surveysApi.get(selectedSurveyId)
      const survey = res.survey || res
      setTitle(survey.title || '')
      setDescription(survey.description || '')
      setType(survey.type || 'PATIENT')
      setIsAnonymous(survey.isAnonymous || false)
      setIsActive(survey.isActive !== false)
      setStartDate(survey.startDate ? new Date(survey.startDate).toISOString().split('T')[0] : '')
      setEndDate(survey.endDate ? new Date(survey.endDate).toISOString().split('T')[0] : '')
      setDepartmentId(survey.departmentId || 'none')

      if (survey.questions && survey.questions.length > 0) {
        setQuestions(
          survey.questions.map((q: any, idx: number) => ({
            id: q.id || generateId(),
            questionText: q.questionText || '',
            questionType: q.questionType || 'STAR_RATING',
            options: q.options
              ? (typeof q.options === 'string'
                  ? (() => { try { return JSON.parse(q.options) } catch { return [] } })()
                  : Array.isArray(q.options) ? q.options : [])
              : [],
            category: q.category || '',
            isRequired: q.isRequired !== false,
            order: q.order ?? idx,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to load survey:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedSurveyId])

  useEffect(() => {
    loadSurvey()
  }, [loadSurvey])

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length)])
  }

  const removeQuestion = (id: string) => {
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.id !== id)
      return filtered.map((q, idx) => ({ ...q, order: idx }))
    })
  }

  const updateQuestion = (id: string, updates: Partial<QuestionForm>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const updated = { ...q, ...updates }
        // Reset options when changing away from MCQ/DROPDOWN
        if (updates.questionType && !['MULTIPLE_CHOICE', 'DROPDOWN'].includes(updates.questionType)) {
          updated.options = []
        }
        // Add default options when switching to MCQ/DROPDOWN
        if (updates.questionType && ['MULTIPLE_CHOICE', 'DROPDOWN'].includes(updates.questionType) && q.options.length === 0) {
          updated.options = ['Option 1', 'Option 2']
        }
        return updated
      })
    )
  }

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id)
      if (idx < 0) return prev
      if (direction === 'up' && idx === 0) return prev
      if (direction === 'down' && idx === prev.length - 1) return prev
      const newQuestions = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[newQuestions[idx], newQuestions[swapIdx]] = [newQuestions[swapIdx], newQuestions[idx]]
      return newQuestions.map((q, i) => ({ ...q, order: i }))
    })
  }

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
      })
    )
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        const newOptions = [...q.options]
        newOptions[optionIndex] = value
        return { ...q, options: newOptions }
      })
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        return { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
      })
    )
  }

  const validate = (): string | null => {
    if (!title.trim()) return 'Survey title is required'
    if (!type) return 'Survey type is required'
    if (questions.length < 1) return 'At least 1 question is required'
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.questionText.trim()) return `Question ${i + 1} text is required`
      if (['MULTIPLE_CHOICE', 'DROPDOWN'].includes(q.questionType) && q.options.length < 2) {
        return `Question ${i + 1} needs at least 2 options`
      }
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setSaving(true)
    try {
      const surveyData = {
        title,
        description: description || undefined,
        type,
        isAnonymous,
        isActive,
        startDate: startDate || null,
        endDate: endDate || null,
        departmentId: departmentId === 'none' ? null : departmentId || null,
        questions: questions.map((q, idx) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: JSON.stringify(q.options),
          category: q.category || null,
          order: idx,
          isRequired: q.isRequired,
        })),
      }

      if (selectedSurveyId) {
        await surveysApi.update(selectedSurveyId, surveyData)
      } else {
        await surveysApi.create(surveyData)
      }
      setSelectedSurveyId(null)
      setActivePage('surveys')
    } catch (err: any) {
      setError(err.message || 'Failed to save survey')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedSurveyId(null)
    setActivePage('surveys')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {selectedSurveyId ? 'Edit Survey' : 'Create Survey'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedSurveyId
              ? 'Update survey settings and questions'
              : 'Design a new satisfaction survey'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Survey'}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex items-center justify-between"
        >
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError('')}>
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Survey Settings */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Survey Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="survey-title">Title *</Label>
                <Input
                  id="survey-title"
                  placeholder="Enter survey title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="survey-description">Description</Label>
                <Textarea
                  id="survey-description"
                  placeholder="Describe the purpose of this survey"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Survey Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PATIENT">Patient Satisfaction</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee Satisfaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Anonymous</Label>
                  <p className="text-xs text-muted-foreground">
                    {isAnonymous
                      ? 'Responses will not be linked to identity'
                      : 'Respondents must login/signup to take survey'}
                  </p>
                </div>
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              </div>

              {!isAnonymous && (
                <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 px-3 py-2.5">
                  <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
                    🔒 Login Required: Respondents will need to sign up or log in before taking this survey. Their responses will be linked to their account.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Allow responses</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Questions</span>
                  <span className="font-medium">{questions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Required Questions</span>
                  <span className="font-medium">{questions.filter((q) => q.isRequired).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Question Types</span>
                  <span className="font-medium">
                    {new Set(questions.map((q) => q.questionType)).size}
                  </span>
                </div>
                {questions.length < 6 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Recommended: at least 6 questions for meaningful analysis
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Questions</h2>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <AnimatePresence mode="popLayout">
            {questions.map((question, idx) => {
              const qType = QUESTION_TYPES.find((t) => t.value === question.questionType)
              const QIcon = qType?.icon || HelpCircle
              const qColor = qType?.color || 'text-muted-foreground'

              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <Card className="overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Question Header */}
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 pt-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1 space-y-3">
                            <Input
                              placeholder="Enter your question..."
                              value={question.questionText}
                              onChange={(e) =>
                                updateQuestion(question.id, { questionText: e.target.value })
                              }
                              className="text-base font-medium"
                            />

                            <div className="flex flex-wrap items-center gap-3">
                              <Select
                                value={question.questionType}
                                onValueChange={(value) =>
                                  updateQuestion(question.id, { questionType: value })
                                }
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {QUESTION_TYPES.map((qt) => (
                                    <SelectItem key={qt.value} value={qt.value}>
                                      <span className="flex items-center gap-2">
                                        <qt.icon className={`h-3.5 w-3.5 ${qt.color}`} />
                                        {qt.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground">Required</Label>
                                <Switch
                                  checked={question.isRequired}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(question.id, { isRequired: checked })
                                  }
                                />
                              </div>

                              <Input
                                placeholder="Category (e.g. Cleanliness)"
                                value={question.category}
                                onChange={(e) =>
                                  updateQuestion(question.id, { category: e.target.value })
                                }
                                className="w-44"
                              />
                            </div>

                            {/* Question Type Preview */}
                            {question.questionType === 'STAR_RATING' && (
                              <div className="flex items-center gap-1 px-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className="h-6 w-6 text-amber-300"
                                  />
                                ))}
                                <span className="text-xs text-muted-foreground ml-2">
                                  1-5 star rating
                                </span>
                              </div>
                            )}

                            {question.questionType === 'YES_NO' && (
                              <div className="flex gap-3 px-2">
                                <div className="px-4 py-2 rounded-lg border border-teal-200 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-sm font-medium">
                                  Yes
                                </div>
                                <div className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium">
                                  No
                                </div>
                              </div>
                            )}

                            {question.questionType === 'TEXT' && (
                              <div className="px-2">
                                <div className="w-full h-16 border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                  Text response area
                                </div>
                              </div>
                            )}

                            {/* Options Editor for MCQ and Dropdown */}
                            {['MULTIPLE_CHOICE', 'DROPDOWN'].includes(question.questionType) && (
                              <div className="space-y-2 px-2">
                                <Label className="text-sm font-medium">Options</Label>
                                {question.options.map((option, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <Input
                                      value={option}
                                      onChange={(e) =>
                                        updateOption(question.id, optIdx, e.target.value)
                                      }
                                      className="flex-1"
                                      placeholder={`Option ${optIdx + 1}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeOption(question.id, optIdx)}
                                      disabled={question.options.length <= 2}
                                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addOption(question.id)}
                                  className="gap-1.5 mt-2"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Option
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveQuestion(question.id, 'up')}
                              disabled={idx === 0}
                              className="h-8 w-8"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveQuestion(question.id, 'down')}
                              disabled={idx === questions.length - 1}
                              className="h-8 w-8"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeQuestion(question.id)}
                              disabled={questions.length <= 1}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Add Question Button */}
          <Button
            variant="outline"
            onClick={addQuestion}
            className="w-full h-16 border-dashed border-2 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-2 text-muted-foreground hover:text-emerald-600"
          >
            <Plus className="h-5 w-5" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h2 className="text-xl font-bold">{title || 'Untitled Survey'}</h2>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  className={
                    type === 'PATIENT'
                      ? 'bg-teal-100 text-teal-700 border-teal-200'
                      : 'bg-purple-100 text-purple-700 border-purple-200'
                  }
                >
                  {type}
                </Badge>
                {isAnonymous && <Badge variant="outline">Anonymous</Badge>}
              </div>
            </div>
            <Separator />
            {questions.map((q, idx) => {
              const qType = QUESTION_TYPES.find((t) => t.value === q.questionType)
              return (
                <div key={q.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-emerald-600">{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {q.questionText || 'Untitled question'}
                        {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      {q.category && (
                        <span className="text-xs text-muted-foreground">{q.category}</span>
                      )}

                      {/* Preview based on type */}
                      <div className="mt-2">
                        {q.questionType === 'STAR_RATING' && (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="h-6 w-6 text-amber-300" />
                            ))}
                          </div>
                        )}
                        {q.questionType === 'TEXT' && (
                          <div className="w-full h-16 border rounded-lg bg-muted/50" />
                        )}
                        {q.questionType === 'YES_NO' && (
                          <div className="flex gap-3">
                            <div className="px-4 py-2 rounded-lg border text-sm">Yes</div>
                            <div className="px-4 py-2 rounded-lg border text-sm">No</div>
                          </div>
                        )}
                        {q.questionType === 'MULTIPLE_CHOICE' && (
                          <div className="space-y-2">
                            {q.options.map((opt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full border" />
                                <span className="text-sm">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.questionType === 'DROPDOWN' && (
                          <div className="border rounded-lg px-3 py-2 text-sm text-muted-foreground w-48">
                            Select an option...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {idx < questions.length - 1 && <Separator className="mt-4" />}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
