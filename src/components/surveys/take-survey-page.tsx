'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle2,
  Heart,
  Building2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useAppStore, useAuthStore } from '@/lib/stores'
import { surveysApi, departmentsApi } from '@/lib/api'

interface SurveyQuestion {
  id: string
  questionText: string
  questionType: string
  options: string
  order: number
  isRequired: boolean
  category?: string
}

interface SurveyData {
  id: string
  title: string
  description?: string
  type: string
  isActive: boolean
  isAnonymous: boolean
  questions: SurveyQuestion[]
}

interface Department {
  id: string
  name: string
  code: string
}

interface AnswerData {
  questionId: string
  answerNumber?: number
  answerText?: string
  answerChoice?: string
}

function InteractiveStarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (rating: number) => void
}) {
  const [hoverRating, setHoverRating] = useState(0)

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`h-10 w-10 transition-colors ${
              star <= (hoverRating || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-muted-foreground/30 hover:text-amber-200'
            }`}
          />
        </motion.button>
      ))}
      {value > 0 && (
        <span className="text-sm font-medium text-amber-600 ml-2">
          {value}/5
        </span>
      )}
    </div>
  )
}

export function TakeSurveyPage() {
  const { setActivePage, selectedSurveyId } = useAppStore()
  const { user } = useAuthStore()

  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('none')
  const [overallRating, setOverallRating] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [wizardMode, setWizardMode] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchSurvey = useCallback(async () => {
    if (!selectedSurveyId) return
    setLoading(true)
    try {
      const res: any = await surveysApi.get(selectedSurveyId)
      const data = res.survey || res
      setSurvey(data)
      // Initialize answers
      const initialAnswers: Record<string, AnswerData> = {}
      if (data.questions) {
        data.questions.forEach((q: SurveyQuestion) => {
          initialAnswers[q.id] = { questionId: q.id }
        })
      }
      setAnswers(initialAnswers)
    } catch (err) {
      console.error('Failed to load survey:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedSurveyId])

  const fetchDepartments = useCallback(async () => {
    try {
      const res: any = await departmentsApi.list()
      const list = Array.isArray(res) ? res : res.departments || []
      setDepartments(list.filter((d: any) => d.isActive !== false))
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }, [])

  useEffect(() => {
    fetchSurvey()
    fetchDepartments()
  }, [fetchSurvey, fetchDepartments])

  // Auto-fill department from logged-in user's profile
  useEffect(() => {
    if (user?.department?.id && selectedDepartment === 'none') {
      setSelectedDepartment(user.department.id)
    }
  }, [user, departments])

  const questions = survey?.questions || []
  const currentQ = questions[currentQuestion]
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0

  const updateAnswer = (questionId: string, updates: Partial<AnswerData>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }))
    // Clear error for this question
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })
    }
  }

  const parseOptions = (optionsStr: string): string[] => {
    try {
      return JSON.parse(optionsStr)
    } catch {
      return []
    }
  }

  const validateCurrentQuestion = (): boolean => {
    if (!currentQ) return true
    if (!currentQ.isRequired) return true

    const answer = answers[currentQ.id]
    if (!answer) return false

    if (currentQ.questionType === 'STAR_RATING' && !answer.answerNumber) {
      setErrors((prev) => ({ ...prev, [currentQ.id]: 'Please select a rating' }))
      return false
    }
    if (currentQ.questionType === 'TEXT' && !answer.answerText?.trim()) {
      setErrors((prev) => ({ ...prev, [currentQ.id]: 'Please provide an answer' }))
      return false
    }
    if (
      ['MULTIPLE_CHOICE', 'YES_NO', 'DROPDOWN'].includes(currentQ.questionType) &&
      !answer.answerChoice
    ) {
      setErrors((prev) => ({ ...prev, [currentQ.id]: 'Please select an option' }))
      return false
    }
    return true
  }

  const handleNext = () => {
    if (!validateCurrentQuestion()) return
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}
    let valid = true

    questions.forEach((q) => {
      if (!q.isRequired) return
      const answer = answers[q.id]
      if (!answer) {
        newErrors[q.id] = 'This question is required'
        valid = false
        return
      }
      if (q.questionType === 'STAR_RATING' && !answer.answerNumber) {
        newErrors[q.id] = 'Please select a rating'
        valid = false
      }
      if (q.questionType === 'TEXT' && !answer.answerText?.trim()) {
        newErrors[q.id] = 'Please provide an answer'
        valid = false
      }
      if (
        ['MULTIPLE_CHOICE', 'YES_NO', 'DROPDOWN'].includes(q.questionType) &&
        !answer.answerChoice
      ) {
        newErrors[q.id] = 'Please select an option'
        valid = false
      }
    })

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async () => {
    if (!validateAll()) return
    if (!survey) return

    setSubmitting(true)
    try {
      const answerList = Object.values(answers).filter(
        (a) => a.answerNumber || a.answerText || a.answerChoice
      )

      await surveysApi.submitResponse(survey.id, {
        isAnonymous: survey.isAnonymous,
        departmentId: user?.department?.id || (selectedDepartment === 'none' ? undefined : selectedDepartment || undefined),
        overallRating: overallRating || undefined,
        answers: answerList,
      })

      setSubmitted(true)
    } catch (err: any) {
      console.error('Failed to submit survey:', err)
      setErrors({ submit: err.message || 'Failed to submit survey' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="text-center space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mx-auto" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Survey Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The survey you&apos;re looking for doesn&apos;t exist or is no longer available.
        </p>
        <Button variant="outline" onClick={() => setActivePage('surveys')}>
          Back to Surveys
        </Button>
      </div>
    )
  }

  // Thank You Screen
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-3">Thank You!</h2>
          <p className="text-muted-foreground mb-2">
            Your response has been submitted successfully.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Your feedback helps us improve our healthcare services.
          </p>
          <div className="flex items-center justify-center gap-1 text-emerald-500 mb-8">
            <Heart className="h-5 w-5 fill-emerald-500" />
            <span className="font-medium">We appreciate your time</span>
            <Heart className="h-5 w-5 fill-emerald-500" />
          </div>
          <Button
            onClick={() => setActivePage('surveys')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Back to Surveys
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Hospital Branding Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            City General Hospital
          </span>
        </div>
        <Separator className="max-w-xs mx-auto" />
      </div>

      {/* Survey Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-xl sm:text-2xl font-bold mb-2">{survey.title}</h1>
        {survey.description && (
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            {survey.description}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge
            className={
              survey.type === 'PATIENT'
                ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300'
                : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
            }
          >
            {survey.type === 'PATIENT' ? 'Patient Survey' : 'Employee Survey'}
          </Badge>
          {survey.isAnonymous && (
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Anonymous
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Anonymous Notice */}
      {survey.isAnonymous && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 mb-6 flex items-start gap-2"
        >
          <Shield className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            This survey is anonymous. Your responses will not be linked to your identity.
          </p>
        </motion.div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">View:</Label>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setWizardMode(true)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                wizardMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              One at a time
            </button>
            <button
              onClick={() => setWizardMode(false)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                !wizardMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              All questions
            </button>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentQuestion + 1} of {questions.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Department & Overall Rating (shown before questions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          {user?.department?.id ? (
            <>
              <Label className="text-sm">Department</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{user.department.name || 'Your Department'}</span>
                <Badge variant="outline" className="ml-auto text-xs">Auto-filled</Badge>
              </div>
            </>
          ) : (
            <>
              <Label className="text-sm">Department (optional)</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select your department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Overall Rating (optional)</Label>
          <InteractiveStarRating value={overallRating} onChange={setOverallRating} />
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Questions */}
      {wizardMode ? (
        /* Wizard Mode - one question at a time */
        <AnimatePresence mode="wait">
          {currentQ && (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    {/* Category badge */}
                    {currentQ.category && (
                      <Badge variant="outline" className="text-xs">
                        {currentQ.category}
                      </Badge>
                    )}

                    {/* Question */}
                    <div>
                      <h3 className="text-lg font-medium">
                        {currentQ.questionText}
                        {currentQ.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                    </div>

                    {/* Answer Input based on type */}
                    {currentQ.questionType === 'STAR_RATING' && (
                      <div>
                        <InteractiveStarRating
                          value={answers[currentQ.id]?.answerNumber || 0}
                          onChange={(rating) =>
                            updateAnswer(currentQ.id, { answerNumber: rating })
                          }
                        />
                      </div>
                    )}

                    {currentQ.questionType === 'TEXT' && (
                      <Textarea
                        placeholder="Type your answer here..."
                        value={answers[currentQ.id]?.answerText || ''}
                        onChange={(e) =>
                          updateAnswer(currentQ.id, { answerText: e.target.value })
                        }
                        rows={4}
                      />
                    )}

                    {currentQ.questionType === 'MULTIPLE_CHOICE' && (
                      <RadioGroup
                        value={answers[currentQ.id]?.answerChoice || ''}
                        onValueChange={(value) =>
                          updateAnswer(currentQ.id, { answerChoice: value })
                        }
                        className="space-y-3"
                      >
                        {parseOptions(currentQ.options).map((option, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <RadioGroupItem value={option} id={`${currentQ.id}-opt-${idx}`} />
                            <Label
                              htmlFor={`${currentQ.id}-opt-${idx}`}
                              className="flex-1 cursor-pointer"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {currentQ.questionType === 'YES_NO' && (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => updateAnswer(currentQ.id, { answerChoice: 'Yes' })}
                          className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${
                            answers[currentQ.id]?.answerChoice === 'Yes'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-600'
                              : 'border-muted hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <CheckCircle2 className="h-6 w-6 mx-auto mb-1" />
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAnswer(currentQ.id, { answerChoice: 'No' })}
                          className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${
                            answers[currentQ.id]?.answerChoice === 'No'
                              ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 dark:border-red-600'
                              : 'border-muted hover:border-red-300 hover:bg-red-50/50'
                          }`}
                        >
                          <span className="text-2xl mb-1 block">&times;</span>
                          No
                        </button>
                      </div>
                    )}

                    {currentQ.questionType === 'DROPDOWN' && (
                      <Select
                        value={answers[currentQ.id]?.answerChoice || ''}
                        onValueChange={(value) =>
                          updateAnswer(currentQ.id, { answerChoice: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {parseOptions(currentQ.options).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Error message */}
                    {errors[currentQ.id] && (
                      <p className="text-sm text-red-500 mt-2">{errors[currentQ.id]}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentQuestion === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                {currentQuestion < questions.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {submitting ? 'Submitting...' : 'Submit Survey'}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        /* All Questions Mode */
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {q.category && (
                      <Badge variant="outline" className="text-xs">
                        {q.category}
                      </Badge>
                    )}
                    <h3 className="text-base font-medium">
                      <span className="text-emerald-600 mr-2">{idx + 1}.</span>
                      {q.questionText}
                      {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </h3>

                    {q.questionType === 'STAR_RATING' && (
                      <InteractiveStarRating
                        value={answers[q.id]?.answerNumber || 0}
                        onChange={(rating) => updateAnswer(q.id, { answerNumber: rating })}
                      />
                    )}

                    {q.questionType === 'TEXT' && (
                      <Textarea
                        placeholder="Type your answer here..."
                        value={answers[q.id]?.answerText || ''}
                        onChange={(e) => updateAnswer(q.id, { answerText: e.target.value })}
                        rows={3}
                      />
                    )}

                    {q.questionType === 'MULTIPLE_CHOICE' && (
                      <RadioGroup
                        value={answers[q.id]?.answerChoice || ''}
                        onValueChange={(value) => updateAnswer(q.id, { answerChoice: value })}
                        className="space-y-2"
                      >
                        {parseOptions(q.options).map((option, optIdx) => (
                          <div
                            key={optIdx}
                            className="flex items-center space-x-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <RadioGroupItem value={option} id={`${q.id}-opt-${optIdx}`} />
                            <Label htmlFor={`${q.id}-opt-${optIdx}`} className="flex-1 cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {q.questionType === 'YES_NO' && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateAnswer(q.id, { answerChoice: 'Yes' })}
                          className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${
                            answers[q.id]?.answerChoice === 'Yes'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-600'
                              : 'border-muted hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAnswer(q.id, { answerChoice: 'No' })}
                          className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${
                            answers[q.id]?.answerChoice === 'No'
                              ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 dark:border-red-600'
                              : 'border-muted hover:border-red-300 hover:bg-red-50/50'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    )}

                    {q.questionType === 'DROPDOWN' && (
                      <Select
                        value={answers[q.id]?.answerChoice || ''}
                        onValueChange={(value) => updateAnswer(q.id, { answerChoice: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {parseOptions(q.options).map((option, optIdx) => (
                            <SelectItem key={optIdx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {errors[q.id] && (
                      <p className="text-sm text-red-500">{errors[q.id]}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Submit button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[200px]"
            >
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </Button>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500 text-center">{errors.submit}</p>
          )}
        </div>
      )}

      {/* Hospital Branding Footer */}
      <div className="text-center mt-8 pt-6 border-t">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} City General Hospital — Patient & Employee Satisfaction Survey
        </p>
      </div>
    </div>
  )
}
