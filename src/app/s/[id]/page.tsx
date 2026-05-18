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
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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

// ─── Types ──────────────────────────────────────────────────────────────────

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
  department?: { id: string; name: string; code: string }
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

interface RespondentUser {
  id: string
  email: string
  name: string
  token: string
  departmentId?: string | null
  departmentName?: string | null
}

// ─── Star Rating Component ──────────────────────────────────────────────────

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

// ─── Auth Form Component ────────────────────────────────────────────────────

function SurveyAuthForm({
  surveyType,
  onAuth,
  onSkip,
}: {
  surveyType: string
  onAuth: (user: RespondentUser) => void
  onSkip?: () => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Signup fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    fetch('/api/departments/public')
      .then((res) => res.json())
      .then((data) => {
        const list = data.departments || []
        setDepartments(list)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (!name.trim() || !email.trim() || !password) {
          setError('Name, email, and password are required')
          setLoading(false)
          return
        }

        // For employees, department is required
        if (isEmployee && (!selectedDept || selectedDept === 'none')) {
          setError('Please select your department')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            phone: phone.trim() || undefined,
            departmentId: selectedDept || undefined,
            type: surveyType === 'EMPLOYEE' ? 'employee' : 'patient',
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Signup failed' }))
          throw new Error(data.error || 'Signup failed')
        }

        const data = await res.json()
        onAuth({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          token: data.token,
          departmentId: data.user.department?.id || null,
          departmentName: data.user.department?.name || null,
        })
      } else {
        // Login
        if (!email.trim() || !password) {
          setError('Email and password are required')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Login failed' }))
          throw new Error(data.error || 'Invalid credentials')
        }

        const data = await res.json()
        onAuth({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          token: data.token,
          departmentId: data.user.department?.id || null,
          departmentName: data.user.department?.name || null,
        })
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const isEmployee = surveyType === 'EMPLOYEE'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl shadow-teal-900/10 dark:shadow-teal-900/30 backdrop-blur-sm bg-white/90 dark:bg-card/95">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25">
              {isEmployee ? (
                <Building2 className="h-6 w-6 text-white" />
              ) : (
                <Heart className="h-6 w-6 text-white fill-white/30" />
              )}
            </div>
            <h2 className="text-xl font-bold">
              {isEmployee ? 'Employee' : 'Patient'} Verification
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isEmployee
                ? 'Please sign in or create an account to take this employee survey.'
                : 'This survey requires verification. Please sign in or create an account.'}
            </p>
          </CardHeader>

          <CardContent>
            {/* Mode Toggle */}
            <div className="flex mb-6 bg-muted/60 rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setMode('signup'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-card shadow-sm text-teal-700 dark:text-teal-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-card shadow-sm text-teal-700 dark:text-teal-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Log In
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Create a password (min 6 chars)' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {departments.length > 0 && (
                    <div className="space-y-2">
                      <Label>
                        Department {isEmployee ? '' : '(optional)'}
                        {isEmployee && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger>
                          <SelectValue placeholder={isEmployee ? 'Select your department (required)' : 'Select your department'} />
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
                      {isEmployee && (
                        <p className="text-xs text-muted-foreground">
                          Your department will be auto-filled in the survey form.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  <>
                    {mode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {onSkip && (
              <div className="mt-4 pt-4 border-t text-center">
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-sm text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  Continue as guest (anonymous)
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Main Public Survey Page ────────────────────────────────────────────────

export default function PublicSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const [surveyId, setSurveyId] = useState<string>('')
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [branding, setBranding] = useState<{ hospitalName: string; hospitalLogoUrl: string; hospitalSubtitle: string; footerText: string }>({
    hospitalName: 'City General Hospital',
    hospitalLogoUrl: '',
    hospitalSubtitle: 'Hospital Survey System',
    footerText: 'Hospital Survey Management System © 2024',
  })
  const [loading, setLoading] = useState(true)
  const [surveyError, setSurveyError] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [respondent, setRespondent] = useState<RespondentUser | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  // Survey form state
  const [selectedDepartment, setSelectedDepartment] = useState('none')
  const [overallRating, setOverallRating] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [wizardMode, setWizardMode] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Resolve params
  useEffect(() => {
    params.then((p) => setSurveyId(p.id))
  }, [params])

  // Fetch branding
  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        setBranding({
          hospitalName: data.hospitalName || 'City General Hospital',
          hospitalLogoUrl: data.hospitalLogoUrl || '',
          hospitalSubtitle: data.hospitalSubtitle || 'Hospital Survey System',
          footerText: data.footerText || 'Hospital Survey Management System © 2024',
        })
      })
      .catch(() => {})
  }, [])

  // Fetch survey data
  const fetchSurvey = useCallback(async () => {
    if (!surveyId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/surveys/public?id=${surveyId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Survey not found' }))
        setSurveyError(data.error || 'Survey not found')
        return
      }
      const data = await res.json()
      setSurvey(data)

      // Initialize answers
      const initialAnswers: Record<string, AnswerData> = {}
      if (data.questions) {
        data.questions.forEach((q: SurveyQuestion) => {
          initialAnswers[q.id] = { questionId: q.id }
        })
      }
      setAnswers(initialAnswers)

      // If not anonymous, show auth form
      if (!data.isAnonymous) {
        setShowAuth(true)
      }
    } catch (err) {
      setSurveyError('Failed to load survey')
    } finally {
      setLoading(false)
    }
  }, [surveyId])

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments/public')
      const data = await res.json()
      setDepartments(data.departments || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }, [])

  useEffect(() => {
    fetchSurvey()
    fetchDepartments()
  }, [fetchSurvey, fetchDepartments])

  const handleAuth = (user: RespondentUser) => {
    setRespondent(user)
    setShowAuth(false)
    // Auto-fill department from respondent's profile
    if (user.departmentId) {
      setSelectedDepartment(user.departmentId)
    }
    // Auto-fill department dropdown question answers for employees
    if (user.departmentName && survey) {
      setAnswers((prev) => {
        const updated = { ...prev }
        survey.questions?.forEach((q) => {
          if (q.questionType === 'DROPDOWN' && !updated[q.id]?.answerChoice) {
            const opts = parseOptions(q.options)
            if (opts.some((o: string) => o.toLowerCase() === user.departmentName?.toLowerCase())) {
              updated[q.id] = { ...updated[q.id], answerChoice: user.departmentName }
            }
          }
        })
        return updated
      })
    }
  }

  const handleSkipAuth = () => {
    setRespondent(null)
    setShowAuth(false)
  }

  // ─── Survey form logic ───────────────────────────────────────────────

  const questions = survey?.questions || []
  const currentQ = questions[currentQuestion]
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0

  const updateAnswer = (questionId: string, updates: Partial<AnswerData>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }))
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
    if (['MULTIPLE_CHOICE', 'YES_NO', 'DROPDOWN'].includes(currentQ.questionType) && !answer.answerChoice) {
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
      if (!answer) { newErrors[q.id] = 'This question is required'; valid = false; return }
      if (q.questionType === 'STAR_RATING' && !answer.answerNumber) { newErrors[q.id] = 'Please select a rating'; valid = false }
      if (q.questionType === 'TEXT' && !answer.answerText?.trim()) { newErrors[q.id] = 'Please provide an answer'; valid = false }
      if (['MULTIPLE_CHOICE', 'YES_NO', 'DROPDOWN'].includes(q.questionType) && !answer.answerChoice) { newErrors[q.id] = 'Please select an option'; valid = false }
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

      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(respondent?.token ? { Authorization: `Bearer ${respondent.token}` } : {}),
        },
        body: JSON.stringify({
          respondentId: respondent?.id || undefined,
          isAnonymous: survey.isAnonymous, // Follow survey's anonymous setting
          departmentId: respondent?.departmentId || (selectedDepartment === 'none' ? undefined : selectedDepartment || undefined),
          overallRating: overallRating || undefined,
          answers: answerList,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Submission failed' }))
        throw new Error(data.error || 'Submission failed')
      }

      setSubmitted(true)
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to submit survey' })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  // Show auth form if not anonymous and user not authenticated
  if (showAuth && survey) {
    return (
      <SurveyAuthForm
        surveyType={survey.type}
        onAuth={handleAuth}
        onSkip={undefined}
      />
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading survey...</p>
        </div>
      </div>
    )
  }

  // Error
  if (surveyError || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-900 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Survey Unavailable</h2>
          <p className="text-muted-foreground mb-6">
            {surveyError || 'The survey you\'re looking for doesn\'t exist or is no longer available.'}
          </p>
        </motion.div>
      </div>
    )
  }

  // Thank You Screen
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-900 px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
            <p className="text-xs text-muted-foreground">
              {branding.footerText}
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // ─── Survey Form ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-900">
      <div className="max-w-2xl mx-auto py-6 px-4">
        {/* Hospital Branding Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            {branding.hospitalLogoUrl ? (
              <img
                src={branding.hospitalLogoUrl}
                alt={branding.hospitalName}
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-emerald-600" />
            )}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {branding.hospitalName}
            </span>
          </div>
          <Separator className="max-w-xs mx-auto" />
        </div>

        {/* Respondent info badge */}
        {respondent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {respondent.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-teal-700 dark:text-teal-300 truncate">
                {respondent.name}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-teal-600/70 dark:text-teal-400/70">
                <span className="truncate">{respondent.email}</span>
                {respondent.departmentName && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Building2 className="h-3 w-3" />
                      {respondent.departmentName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

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

        {/* Anonymous / Non-anonymous notice */}
        {survey.isAnonymous ? (
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
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3 mb-6 flex items-start gap-2"
          >
            <Heart className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <p className="text-sm text-teal-700 dark:text-teal-300">
              {respondent
                ? `Your responses will be linked to your account (${respondent.email}).`
                : 'Your responses will be linked to your identity for follow-up purposes.'}
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

        {/* Department & Overall Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            {respondent?.departmentId ? (
              <>
                <Label className="text-sm">Department</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{respondent.departmentName || departments.find(d => d.id === respondent.departmentId)?.name || 'Your Department'}</span>
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

        {/* Questions - Wizard Mode */}
        {wizardMode ? (
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
                      {currentQ.category && (
                        <Badge variant="outline" className="text-xs">{currentQ.category}</Badge>
                      )}
                      <div>
                        <h3 className="text-lg font-medium">
                          {currentQ.questionText}
                          {currentQ.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                      </div>

                      {currentQ.questionType === 'STAR_RATING' && (
                        <InteractiveStarRating
                          value={answers[currentQ.id]?.answerNumber || 0}
                          onChange={(rating) => updateAnswer(currentQ.id, { answerNumber: rating })}
                        />
                      )}
                      {currentQ.questionType === 'TEXT' && (
                        <Textarea
                          placeholder="Type your answer here..."
                          value={answers[currentQ.id]?.answerText || ''}
                          onChange={(e) => updateAnswer(currentQ.id, { answerText: e.target.value })}
                          rows={4}
                        />
                      )}
                      {currentQ.questionType === 'MULTIPLE_CHOICE' && (
                        <RadioGroup
                          value={answers[currentQ.id]?.answerChoice || ''}
                          onValueChange={(value) => updateAnswer(currentQ.id, { answerChoice: value })}
                          className="space-y-3"
                        >
                          {parseOptions(currentQ.options).map((option, idx) => (
                            <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                              <RadioGroupItem value={option} id={`${currentQ.id}-opt-${idx}`} />
                              <Label htmlFor={`${currentQ.id}-opt-${idx}`} className="flex-1 cursor-pointer">{option}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                      {currentQ.questionType === 'YES_NO' && (
                        <div className="grid grid-cols-2 gap-4">
                          <button type="button" onClick={() => updateAnswer(currentQ.id, { answerChoice: 'Yes' })}
                            className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${
                              answers[currentQ.id]?.answerChoice === 'Yes'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-600'
                                : 'border-muted hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
                            <CheckCircle2 className="h-6 w-6 mx-auto mb-1" /> Yes
                          </button>
                          <button type="button" onClick={() => updateAnswer(currentQ.id, { answerChoice: 'No' })}
                            className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${
                              answers[currentQ.id]?.answerChoice === 'No'
                                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 dark:border-red-600'
                                : 'border-muted hover:border-red-300 hover:bg-red-50/50'}`}>
                            <span className="text-2xl mb-1 block">&times;</span> No
                          </button>
                        </div>
                      )}
                      {currentQ.questionType === 'DROPDOWN' && (
                        <Select value={answers[currentQ.id]?.answerChoice || ''} onValueChange={(value) => updateAnswer(currentQ.id, { answerChoice: value })}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select an option..." /></SelectTrigger>
                          <SelectContent>
                            {parseOptions(currentQ.options).map((option, idx) => (
                              <SelectItem key={idx} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {errors[currentQ.id] && <p className="text-sm text-red-500 mt-2">{errors[currentQ.id]}</p>}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between mt-6">
                  <Button variant="outline" onClick={handlePrev} disabled={currentQuestion === 0} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  {currentQuestion < questions.length - 1 ? (
                    <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
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
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {q.category && <Badge variant="outline" className="text-xs">{q.category}</Badge>}
                      <h3 className="text-base font-medium">
                        <span className="text-emerald-600 mr-2">{idx + 1}.</span>
                        {q.questionText}
                        {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      {q.questionType === 'STAR_RATING' && (
                        <InteractiveStarRating value={answers[q.id]?.answerNumber || 0} onChange={(rating) => updateAnswer(q.id, { answerNumber: rating })} />
                      )}
                      {q.questionType === 'TEXT' && (
                        <Textarea placeholder="Type your answer here..." value={answers[q.id]?.answerText || ''} onChange={(e) => updateAnswer(q.id, { answerText: e.target.value })} rows={3} />
                      )}
                      {q.questionType === 'MULTIPLE_CHOICE' && (
                        <RadioGroup value={answers[q.id]?.answerChoice || ''} onValueChange={(value) => updateAnswer(q.id, { answerChoice: value })} className="space-y-2">
                          {parseOptions(q.options).map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                              <RadioGroupItem value={option} id={`${q.id}-opt-${optIdx}`} />
                              <Label htmlFor={`${q.id}-opt-${optIdx}`} className="flex-1 cursor-pointer">{option}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                      {q.questionType === 'YES_NO' && (
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => updateAnswer(q.id, { answerChoice: 'Yes' })}
                            className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${
                              answers[q.id]?.answerChoice === 'Yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-muted hover:border-emerald-300'}`}>Yes</button>
                          <button type="button" onClick={() => updateAnswer(q.id, { answerChoice: 'No' })}
                            className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${
                              answers[q.id]?.answerChoice === 'No' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'border-muted hover:border-red-300'}`}>No</button>
                        </div>
                      )}
                      {q.questionType === 'DROPDOWN' && (
                        <Select value={answers[q.id]?.answerChoice || ''} onValueChange={(value) => updateAnswer(q.id, { answerChoice: value })}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select an option..." /></SelectTrigger>
                          <SelectContent>
                            {parseOptions(q.options).map((option, optIdx) => (
                              <SelectItem key={optIdx} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {errors[q.id] && <p className="text-sm text-red-500">{errors[q.id]}</p>}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <div className="flex justify-center pt-4">
              <Button onClick={handleSubmit} disabled={submitting} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[200px]">
                {submitting ? 'Submitting...' : 'Submit Survey'}
              </Button>
            </div>
            {errors.submit && <p className="text-sm text-red-500 text-center">{errors.submit}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground">
            {branding.footerText}
          </p>
        </div>
      </div>
    </div>
  )
}
