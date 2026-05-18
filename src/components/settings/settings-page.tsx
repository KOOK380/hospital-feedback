'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Settings,
  Building2,
  MessageSquare,
  Shield,
  Link2,
  ClipboardList,
  Save,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  X,
  Phone,
  Key,
  Globe,
  Clock,
  Lock,
  Mail,
  Server,
  Webhook,
  Upload,
  Image as ImageIcon,
  Trash2,
  UserCog,
  CheckCircle2,
  Heart,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { settingsApi, rolesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SettingItem {
  id: string
  key: string
  value: string
  category: string
  createdAt: string
  updatedAt: string
}

type SettingsGrouped = Record<string, Record<string, string>>

// ─── Animation variants ─────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ─── Default values ──────────────────────────────────────────────────────────

const DEFAULT_GENERAL: Record<string, string> = {
  hospitalName: 'City General Hospital',
  hospitalLogoUrl: '',
  hospitalSubtitle: 'Hospital Survey System',
  footerText: 'Hospital Survey Management System © 2024',
  timezone: 'Asia/Kolkata',
  defaultLanguage: 'en',
  systemEmail: 'admin@hospital.com',
}

const DEFAULT_SMS: Record<string, string> = {
  defaultSmsProvider: 'TWILIO',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioPhoneNumber: '',
  msg91AuthKey: '',
  msg91SenderId: '',
  textlocalApiKey: '',
  textlocalSender: '',
  autoSendSmsAfterAppointments: 'false',
  smsRetryCount: '3',
  smsRetryInterval: '5',
}

const DEFAULT_SECURITY: Record<string, string> = {
  sessionTimeoutDuration: '30',
  maxLoginAttempts: '5',
  passwordMinLength: '8',
  requireSpecialCharacters: 'true',
  twoFactorAuthEnabled: 'false',
  ipWhitelist: '',
}

const DEFAULT_INTEGRATION: Record<string, string> = {
  conceptSoftwareApiUrl: '',
  conceptSoftwareApiKey: '',
  webhookUrl: '',
  webhookSecret: '',
  syncFrequency: '60',
  integrationEnabled: 'false',
  webhookEnabled: 'false',
}

const DEFAULT_SURVEY: Record<string, string> = {
  defaultAnonymousMode: 'true',
  minimumQuestionsRequired: '3',
  autoCloseSurveyDays: '30',
  surveyLinkBaseUrl: 'https://survey.hospital.com',
}

// ─── Permission Groups ───────────────────────────────────────────────────────

interface Permission {
  key: string
  label: string
  description: string
}

interface PermissionGroup {
  name: string
  permissions: Permission[]
}

interface RoleItem {
  id: string
  name: string
  permissions: string[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Dashboard',
    permissions: [
      { key: 'view_dashboard', label: 'View Dashboard', description: 'Access the main dashboard' },
      { key: 'view_analytics', label: 'View Analytics', description: 'View analytics and charts' },
    ],
  },
  {
    name: 'Surveys',
    permissions: [
      { key: 'view_surveys', label: 'View Surveys', description: 'View survey list and details' },
      { key: 'manage_surveys', label: 'Manage Surveys', description: 'Create, edit, delete surveys' },
      { key: 'view_responses', label: 'View Responses', description: 'View survey responses' },
    ],
  },
  {
    name: 'Users & HR',
    permissions: [
      { key: 'manage_users', label: 'Manage Users', description: 'Create, edit, delete users' },
      { key: 'manage_employees', label: 'Manage Employees', description: 'HR management features' },
    ],
  },
  {
    name: 'Departments',
    permissions: [
      { key: 'manage_departments', label: 'Manage Departments', description: 'Create, edit, delete departments' },
    ],
  },
  {
    name: 'SMS',
    permissions: [
      { key: 'send_sms', label: 'Send SMS', description: 'Send SMS messages' },
      { key: 'manage_sms_templates', label: 'Manage SMS Templates', description: 'Create, edit SMS templates' },
    ],
  },
  {
    name: 'Appointments',
    permissions: [
      { key: 'manage_appointments', label: 'Manage Appointments', description: 'Create, edit appointments' },
      { key: 'view_appointments', label: 'View Appointments', description: 'View appointment list' },
    ],
  },
  {
    name: 'Reports',
    permissions: [
      { key: 'view_reports', label: 'View Reports', description: 'Access reports section' },
      { key: 'export_data', label: 'Export Data', description: 'Export data and reports' },
    ],
  },
  {
    name: 'System',
    permissions: [
      { key: 'manage_system', label: 'Manage Settings', description: 'Access system settings' },
      { key: 'view_audit_logs', label: 'View Audit Logs', description: 'View system audit logs' },
      { key: 'manage_integrations', label: 'Manage Integrations', description: 'Configure third-party integrations' },
    ],
  },
]

// Roles to display as editable columns (excludes SUPER_ADMIN and RESPONDENT)
const EDITABLE_ROLES = ['IT_ADMIN', 'HR', 'ACCOUNTS', 'RECEPTION', 'QUALITY', 'AUTHORIZED']

const ROLE_COLORS: Record<string, string> = {
  IT_ADMIN: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  HR: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  ACCOUNTS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  RECEPTION: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  QUALITY: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  AUTHORIZED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const ROLE_LABELS: Record<string, string> = {
  IT_ADMIN: 'IT Admin',
  HR: 'HR',
  ACCOUNTS: 'Accounts',
  RECEPTION: 'Reception',
  QUALITY: 'Quality',
  AUTHORIZED: 'Patient',
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function getWithDefault(
  grouped: SettingsGrouped,
  category: string,
  key: string,
  fallback: string
): string {
  return grouped[category]?.[key] ?? fallback
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="rounded-xl">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Section Card wrapper ────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  onSave,
  saving,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  onSave: () => void
  saving: boolean
}) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
              <Icon className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          <Separator className="my-2" />
          <div className="flex justify-end">
            <Button
              onClick={onSave}
              disabled={saving}
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Field Components ────────────────────────────────────────────────────────

function TextField({
  label,
  description,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon: Icon,
}: {
  label: string
  description?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  icon?: React.ElementType
}) {
  const [showValue, setShowValue] = useState(type === 'password')
  const isPassword = type === 'password'

  return (
    <div className="grid gap-2 sm:grid-cols-4 sm:items-center">
      <Label className="sm:col-span-1 text-sm font-medium">{label}</Label>
      <div className="sm:col-span-3 flex items-center gap-2">
        <div className="relative flex-1">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <Input
            type={isPassword && showValue ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={Icon ? 'pl-9' : ''}
          />
          {isPassword && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </div>
      {description && (
        <p className="sm:col-span-4 text-xs text-muted-foreground sm:col-start-2">
          {description}
        </p>
      )}
    </div>
  )
}

function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SelectField({
  label,
  description,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  description?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-4 sm:items-center">
      <Label className="sm:col-span-1 text-sm font-medium">{label}</Label>
      <div className="sm:col-span-3">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {description && (
        <p className="sm:col-span-4 text-xs text-muted-foreground sm:col-start-2">
          {description}
        </p>
      )}
    </div>
  )
}

// ─── Logo Upload Field ──────────────────────────────────────────────────────

function LogoUploadField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Only PNG, JPG, SVG, WebP, and GIF images are allowed.',
      })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 2MB.',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = useAuthStore.getState().token
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(error.error || 'Upload failed')
      }

      const data = await res.json()
      onChange(data.url)
      toast.success('Logo uploaded successfully')
    } catch (err: any) {
      toast.error('Upload failed', {
        description: err.message || 'An error occurred during upload',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleRemove = () => {
    onChange('')
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Hospital Logo</Label>
      <p className="text-xs text-muted-foreground">
        Upload a logo image (PNG, JPG, SVG, WebP, GIF — max 2MB). This logo will appear on the login page and sidebar.
      </p>

      {value ? (
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="h-20 w-20 rounded-xl border-2 border-border bg-muted/50 flex items-center justify-center overflow-hidden shadow-sm">
              <img
                src={value}
                alt="Hospital logo"
                className="h-full w-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
              aria-label="Remove logo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Change Logo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={handleRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
              : 'border-border hover:border-teal-400 hover:bg-muted/30'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
                <Upload className="h-6 w-6 text-teal-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PNG, JPG, SVG, WebP, or GIF (max 2MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file)
          // Reset input so same file can be selected again
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── IP Whitelist Editor ─────────────────────────────────────────────────────

function IpWhitelistEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const ips = value
    ? value.split(',').map((ip) => ip.trim()).filter(Boolean)
    : []
  const [newIp, setNewIp] = useState('')

  const addIp = () => {
    const trimmed = newIp.trim()
    if (trimmed && !ips.includes(trimmed)) {
      const updated = [...ips, trimmed].join(',')
      onChange(updated)
      setNewIp('')
    }
  }

  const removeIp = (ip: string) => {
    const updated = ips.filter((i) => i !== ip).join(',')
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">IP Whitelist</Label>
      <p className="text-xs text-muted-foreground">
        Only allow login from these IP addresses. Leave empty to allow all.
      </p>
      <div className="flex gap-2">
        <Input
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
          placeholder="e.g. 192.168.1.100"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addIp()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIp}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      {ips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ips.map((ip) => (
            <Badge
              key={ip}
              variant="secondary"
              className="gap-1 px-2 py-1 text-xs"
            >
              {ip}
              <button
                type="button"
                onClick={() => removeIp(ip)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

export function SettingsPage() {
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = currentUser?.role?.name === 'SUPER_ADMIN'
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [rawSettings, setRawSettings] = useState<SettingItem[]>([])
  const [grouped, setGrouped] = useState<SettingsGrouped>({})

  // ─── Form state ────────────────────────────────────────────────────────
  // General
  const [hospitalName, setHospitalName] = useState(DEFAULT_GENERAL.hospitalName)
  const [hospitalLogoUrl, setHospitalLogoUrl] = useState(DEFAULT_GENERAL.hospitalLogoUrl)
  const [hospitalSubtitle, setHospitalSubtitle] = useState(DEFAULT_GENERAL.hospitalSubtitle)
  const [footerText, setFooterText] = useState(DEFAULT_GENERAL.footerText)
  const [timezone, setTimezone] = useState(DEFAULT_GENERAL.timezone)
  const [defaultLanguage, setDefaultLanguage] = useState(DEFAULT_GENERAL.defaultLanguage)
  const [systemEmail, setSystemEmail] = useState(DEFAULT_GENERAL.systemEmail)

  // SMS
  const [defaultSmsProvider, setDefaultSmsProvider] = useState(DEFAULT_SMS.defaultSmsProvider)
  const [twilioAccountSid, setTwilioAccountSid] = useState(DEFAULT_SMS.twilioAccountSid)
  const [twilioAuthToken, setTwilioAuthToken] = useState(DEFAULT_SMS.twilioAuthToken)
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState(DEFAULT_SMS.twilioPhoneNumber)
  const [msg91AuthKey, setMsg91AuthKey] = useState(DEFAULT_SMS.msg91AuthKey)
  const [msg91SenderId, setMsg91SenderId] = useState(DEFAULT_SMS.msg91SenderId)
  const [textlocalApiKey, setTextlocalApiKey] = useState(DEFAULT_SMS.textlocalApiKey)
  const [textlocalSender, setTextlocalSender] = useState(DEFAULT_SMS.textlocalSender)
  const [autoSendSms, setAutoSendSms] = useState(false)
  const [smsRetryCount, setSmsRetryCount] = useState(DEFAULT_SMS.smsRetryCount)
  const [smsRetryInterval, setSmsRetryInterval] = useState(DEFAULT_SMS.smsRetryInterval)

  // Security
  const [sessionTimeout, setSessionTimeout] = useState(DEFAULT_SECURITY.sessionTimeoutDuration)
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(DEFAULT_SECURITY.maxLoginAttempts)
  const [passwordMinLength, setPasswordMinLength] = useState(DEFAULT_SECURITY.passwordMinLength)
  const [requireSpecialChars, setRequireSpecialChars] = useState(true)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [ipWhitelist, setIpWhitelist] = useState(DEFAULT_SECURITY.ipWhitelist)

  // Integration
  const [conceptApiUrl, setConceptApiUrl] = useState(DEFAULT_INTEGRATION.conceptSoftwareApiUrl)
  const [conceptApiKey, setConceptApiKey] = useState(DEFAULT_INTEGRATION.conceptSoftwareApiKey)
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_INTEGRATION.webhookUrl)
  const [webhookSecret, setWebhookSecret] = useState(DEFAULT_INTEGRATION.webhookSecret)
  const [syncFrequency, setSyncFrequency] = useState(DEFAULT_INTEGRATION.syncFrequency)
  const [integrationEnabled, setIntegrationEnabled] = useState(false)
  const [webhookEnabled, setWebhookEnabled] = useState(false)

  // Survey
  const [defaultAnonymous, setDefaultAnonymous] = useState(true)
  const [minQuestions, setMinQuestions] = useState(DEFAULT_SURVEY.minimumQuestionsRequired)
  const [autoCloseDays, setAutoCloseDays] = useState(DEFAULT_SURVEY.autoCloseSurveyDays)
  const [surveyLinkBaseUrl, setSurveyLinkBaseUrl] = useState(DEFAULT_SURVEY.surveyLinkBaseUrl)

  // Roles & Permissions
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [changedRoles, setChangedRoles] = useState<Set<string>>(new Set())
  const [savingRoles, setSavingRoles] = useState(false)

  // ─── Load settings ─────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const result = await settingsApi.get()
      const settingsArr = (result as any).raw || (result as any).settings || []
      const groupedData = (result as any).settings || {}
      setRawSettings(Array.isArray(settingsArr) ? settingsArr : [])
      setGrouped(groupedData)

      // Populate General
      setHospitalName(getWithDefault(groupedData, 'GENERAL', 'hospitalName', DEFAULT_GENERAL.hospitalName))
      setHospitalLogoUrl(getWithDefault(groupedData, 'GENERAL', 'hospitalLogoUrl', DEFAULT_GENERAL.hospitalLogoUrl))
      setHospitalSubtitle(getWithDefault(groupedData, 'GENERAL', 'hospitalSubtitle', DEFAULT_GENERAL.hospitalSubtitle))
      setFooterText(getWithDefault(groupedData, 'GENERAL', 'footerText', DEFAULT_GENERAL.footerText))
      setTimezone(getWithDefault(groupedData, 'GENERAL', 'timezone', DEFAULT_GENERAL.timezone))
      setDefaultLanguage(getWithDefault(groupedData, 'GENERAL', 'defaultLanguage', DEFAULT_GENERAL.defaultLanguage))
      setSystemEmail(getWithDefault(groupedData, 'GENERAL', 'systemEmail', DEFAULT_GENERAL.systemEmail))

      // Populate SMS
      setDefaultSmsProvider(getWithDefault(groupedData, 'SMS', 'defaultSmsProvider', DEFAULT_SMS.defaultSmsProvider))
      setTwilioAccountSid(getWithDefault(groupedData, 'SMS', 'twilioAccountSid', DEFAULT_SMS.twilioAccountSid))
      setTwilioAuthToken(getWithDefault(groupedData, 'SMS', 'twilioAuthToken', DEFAULT_SMS.twilioAuthToken))
      setTwilioPhoneNumber(getWithDefault(groupedData, 'SMS', 'twilioPhoneNumber', DEFAULT_SMS.twilioPhoneNumber))
      setMsg91AuthKey(getWithDefault(groupedData, 'SMS', 'msg91AuthKey', DEFAULT_SMS.msg91AuthKey))
      setMsg91SenderId(getWithDefault(groupedData, 'SMS', 'msg91SenderId', DEFAULT_SMS.msg91SenderId))
      setTextlocalApiKey(getWithDefault(groupedData, 'SMS', 'textlocalApiKey', DEFAULT_SMS.textlocalApiKey))
      setTextlocalSender(getWithDefault(groupedData, 'SMS', 'textlocalSender', DEFAULT_SMS.textlocalSender))
      setAutoSendSms(getWithDefault(groupedData, 'SMS', 'autoSendSmsAfterAppointments', 'false') === 'true')
      setSmsRetryCount(getWithDefault(groupedData, 'SMS', 'smsRetryCount', DEFAULT_SMS.smsRetryCount))
      setSmsRetryInterval(getWithDefault(groupedData, 'SMS', 'smsRetryInterval', DEFAULT_SMS.smsRetryInterval))

      // Populate Security
      setSessionTimeout(getWithDefault(groupedData, 'SECURITY', 'sessionTimeoutDuration', DEFAULT_SECURITY.sessionTimeoutDuration))
      setMaxLoginAttempts(getWithDefault(groupedData, 'SECURITY', 'maxLoginAttempts', DEFAULT_SECURITY.maxLoginAttempts))
      setPasswordMinLength(getWithDefault(groupedData, 'SECURITY', 'passwordMinLength', DEFAULT_SECURITY.passwordMinLength))
      setRequireSpecialChars(getWithDefault(groupedData, 'SECURITY', 'requireSpecialCharacters', 'true') === 'true')
      setTwoFactorAuth(getWithDefault(groupedData, 'SECURITY', 'twoFactorAuthEnabled', 'false') === 'true')
      setIpWhitelist(getWithDefault(groupedData, 'SECURITY', 'ipWhitelist', DEFAULT_SECURITY.ipWhitelist))

      // Populate Integration
      setConceptApiUrl(getWithDefault(groupedData, 'INTEGRATION', 'conceptSoftwareApiUrl', DEFAULT_INTEGRATION.conceptSoftwareApiUrl))
      setConceptApiKey(getWithDefault(groupedData, 'INTEGRATION', 'conceptSoftwareApiKey', DEFAULT_INTEGRATION.conceptSoftwareApiKey))
      setWebhookUrl(getWithDefault(groupedData, 'INTEGRATION', 'webhookUrl', DEFAULT_INTEGRATION.webhookUrl))
      setWebhookSecret(getWithDefault(groupedData, 'INTEGRATION', 'webhookSecret', DEFAULT_INTEGRATION.webhookSecret))
      setSyncFrequency(getWithDefault(groupedData, 'INTEGRATION', 'syncFrequency', DEFAULT_INTEGRATION.syncFrequency))
      setIntegrationEnabled(getWithDefault(groupedData, 'INTEGRATION', 'integrationEnabled', 'false') === 'true')
      setWebhookEnabled(getWithDefault(groupedData, 'INTEGRATION', 'webhookEnabled', 'false') === 'true')

      // Populate Survey
      setDefaultAnonymous(getWithDefault(groupedData, 'GENERAL', 'defaultAnonymousMode', 'true') === 'true')
      setMinQuestions(getWithDefault(groupedData, 'GENERAL', 'minimumQuestionsRequired', DEFAULT_SURVEY.minimumQuestionsRequired))
      setAutoCloseDays(getWithDefault(groupedData, 'GENERAL', 'autoCloseSurveyDays', DEFAULT_SURVEY.autoCloseSurveyDays))
      setSurveyLinkBaseUrl(getWithDefault(groupedData, 'GENERAL', 'surveyLinkBaseUrl', DEFAULT_SURVEY.surveyLinkBaseUrl))
    } catch (err: any) {
      toast.error('Failed to load settings', {
        description: err.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // ─── Save functions ────────────────────────────────────────────────────

  const saveSection = async (section: string, settings: { key: string; value: string; category: string }[]) => {
    setSavingSection(section)
    try {
      await settingsApi.update(settings)
      toast.success(`${section} settings saved`, {
        description: 'Your changes have been applied successfully.',
      })
    } catch (err: any) {
      toast.error(`Failed to save ${section.toLowerCase()} settings`, {
        description: err.message || 'An error occurred',
      })
    } finally {
      setSavingSection(null)
    }
  }

  const saveGeneral = () =>
    saveSection('General', [
      { key: 'hospitalName', value: hospitalName, category: 'GENERAL' },
      { key: 'hospitalLogoUrl', value: hospitalLogoUrl, category: 'GENERAL' },
      { key: 'hospitalSubtitle', value: hospitalSubtitle, category: 'GENERAL' },
      { key: 'footerText', value: footerText, category: 'GENERAL' },
      { key: 'timezone', value: timezone, category: 'GENERAL' },
      { key: 'defaultLanguage', value: defaultLanguage, category: 'GENERAL' },
      { key: 'systemEmail', value: systemEmail, category: 'GENERAL' },
    ])

  const saveSms = () =>
    saveSection('SMS', [
      { key: 'defaultSmsProvider', value: defaultSmsProvider, category: 'SMS' },
      { key: 'twilioAccountSid', value: twilioAccountSid, category: 'SMS' },
      { key: 'twilioAuthToken', value: twilioAuthToken, category: 'SMS' },
      { key: 'twilioPhoneNumber', value: twilioPhoneNumber, category: 'SMS' },
      { key: 'msg91AuthKey', value: msg91AuthKey, category: 'SMS' },
      { key: 'msg91SenderId', value: msg91SenderId, category: 'SMS' },
      { key: 'textlocalApiKey', value: textlocalApiKey, category: 'SMS' },
      { key: 'textlocalSender', value: textlocalSender, category: 'SMS' },
      { key: 'autoSendSmsAfterAppointments', value: String(autoSendSms), category: 'SMS' },
      { key: 'smsRetryCount', value: smsRetryCount, category: 'SMS' },
      { key: 'smsRetryInterval', value: smsRetryInterval, category: 'SMS' },
    ])

  const saveSecurity = () =>
    saveSection('Security', [
      { key: 'sessionTimeoutDuration', value: sessionTimeout, category: 'SECURITY' },
      { key: 'maxLoginAttempts', value: maxLoginAttempts, category: 'SECURITY' },
      { key: 'passwordMinLength', value: passwordMinLength, category: 'SECURITY' },
      { key: 'requireSpecialCharacters', value: String(requireSpecialChars), category: 'SECURITY' },
      { key: 'twoFactorAuthEnabled', value: String(twoFactorAuth), category: 'SECURITY' },
      { key: 'ipWhitelist', value: ipWhitelist, category: 'SECURITY' },
    ])

  const saveIntegration = () =>
    saveSection('Integration', [
      { key: 'conceptSoftwareApiUrl', value: conceptApiUrl, category: 'INTEGRATION' },
      { key: 'conceptSoftwareApiKey', value: conceptApiKey, category: 'INTEGRATION' },
      { key: 'webhookUrl', value: webhookUrl, category: 'INTEGRATION' },
      { key: 'webhookSecret', value: webhookSecret, category: 'INTEGRATION' },
      { key: 'syncFrequency', value: syncFrequency, category: 'INTEGRATION' },
      { key: 'integrationEnabled', value: String(integrationEnabled), category: 'INTEGRATION' },
      { key: 'webhookEnabled', value: String(webhookEnabled), category: 'INTEGRATION' },
    ])

  const saveSurvey = () =>
    saveSection('Survey', [
      { key: 'defaultAnonymousMode', value: String(defaultAnonymous), category: 'GENERAL' },
      { key: 'minimumQuestionsRequired', value: minQuestions, category: 'GENERAL' },
      { key: 'autoCloseSurveyDays', value: autoCloseDays, category: 'GENERAL' },
      { key: 'surveyLinkBaseUrl', value: surveyLinkBaseUrl, category: 'GENERAL' },
    ])

  // ─── Load roles ──────────────────────────────────────────────────────

  const loadRoles = useCallback(async () => {
    setRolesLoading(true)
    try {
      const result = await rolesApi.list()
      const rolesList = (result as any).roles || []
      setRoles(rolesList)
      const permMap: Record<string, string[]> = {}
      for (const role of rolesList) {
        permMap[role.id] = role.permissions || []
      }
      setRolePermissions(permMap)
      setChangedRoles(new Set())
    } catch (err: any) {
      toast.error('Failed to load roles', {
        description: err.message || 'An error occurred',
      })
    } finally {
      setRolesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  // ─── Toggle permission ───────────────────────────────────────────────

  const togglePermission = (roleId: string, permissionKey: string) => {
    setRolePermissions((prev) => {
      const current = prev[roleId] || []
      const updated = current.includes(permissionKey)
        ? current.filter((p) => p !== permissionKey)
        : [...current, permissionKey]
      return { ...prev, [roleId]: updated }
    })
    setChangedRoles((prev) => new Set(prev).add(roleId))
  }

  // ─── Select / deselect all for a role in a group ─────────────────────

  const toggleGroupForRole = (roleId: string, group: PermissionGroup, enable: boolean) => {
    setRolePermissions((prev) => {
      const current = prev[roleId] || []
      const groupKeys = group.permissions.map((p) => p.key)
      const updated = enable
        ? [...new Set([...current, ...groupKeys])]
        : current.filter((p) => !groupKeys.includes(p))
      return { ...prev, [roleId]: updated }
    })
    setChangedRoles((prev) => new Set(prev).add(roleId))
  }

  // ─── Save roles ──────────────────────────────────────────────────────

  const saveRoles = async () => {
    setSavingRoles(true)
    try {
      const updatePromises = Array.from(changedRoles).map(async (roleId) => {
        const perms = rolePermissions[roleId] || []
        await rolesApi.update(roleId, { permissions: perms })
      })
      await Promise.all(updatePromises)
      setChangedRoles(new Set())
      toast.success('Roles & Permissions saved', {
        description: 'All role permissions have been updated successfully.',
      })
    } catch (err: any) {
      toast.error('Failed to save roles', {
        description: err.message || 'An error occurred',
      })
    } finally {
      setSavingRoles(false)
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return <SettingsSkeleton />
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const isSaving = savingSection !== null

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your hospital system configuration and preferences
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          disabled={loading}
          className="gap-2 self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1 bg-muted/60 sm:w-auto sm:flex-nowrap">
          <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="h-3.5 w-3.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integration" className="gap-1.5 text-xs sm:text-sm">
            <Link2 className="h-3.5 w-3.5" />
            Integration
          </TabsTrigger>
          <TabsTrigger value="survey" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="h-3.5 w-3.5" />
            Survey
          </TabsTrigger>
          {/* Roles tab - only SUPER_ADMIN can see/edit */}
          {isSuperAdmin && (
            <TabsTrigger value="roles" className="gap-1.5 text-xs sm:text-sm">
              <UserCog className="h-3.5 w-3.5" />
              Roles
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── General Tab ────────────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-6">
          <SectionCard
            icon={Building2}
            title="Hospital Information"
            description="Basic hospital details and branding"
            onSave={saveGeneral}
            saving={savingSection === 'General'}
          >
            <TextField
              label="Hospital Name"
              description="The display name used across the system"
              value={hospitalName}
              onChange={setHospitalName}
              placeholder="City General Hospital"
              icon={Building2}
            />
            <LogoUploadField
              value={hospitalLogoUrl}
              onChange={setHospitalLogoUrl}
            />
            <TextField
              label="System Subtitle"
              description="The subtitle shown below the hospital name on login page and sidebar"
              value={hospitalSubtitle}
              onChange={setHospitalSubtitle}
              placeholder="Hospital Survey System"
            />
            <TextField
              label="Footer Text"
              description="Custom text displayed in the page footer"
              value={footerText}
              onChange={setFooterText}
              placeholder="Hospital Survey Management System © 2024"
            />
            <SelectField
              label="Timezone"
              description="Used for scheduling and timestamps"
              value={timezone}
              onChange={setTimezone}
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'America/Chicago', label: 'America/Chicago (CST)' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
                { value: 'Europe/London', label: 'Europe/London (GMT)' },
                { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
                { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
                { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
                { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
              ]}
              placeholder="Select timezone"
            />
            <SelectField
              label="Default Language"
              description="System default language for notifications and UI"
              value={defaultLanguage}
              onChange={setDefaultLanguage}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'ar', label: 'Arabic' },
                { value: 'zh', label: 'Chinese' },
              ]}
              placeholder="Select language"
            />
            <TextField
              label="System Email"
              description="Primary email address for system notifications"
              value={systemEmail}
              onChange={setSystemEmail}
              placeholder="admin@hospital.com"
              icon={Mail}
            />
          </SectionCard>
        </TabsContent>

        {/* ─── SMS Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="sms" className="space-y-6">
          {/* SMS Provider */}
          <SectionCard
            icon={MessageSquare}
            title="SMS Provider Configuration"
            description="Select and configure your SMS service provider"
            onSave={saveSms}
            saving={savingSection === 'SMS'}
          >
            <SelectField
              label="Default Provider"
              description="The SMS gateway used for sending messages"
              value={defaultSmsProvider}
              onChange={setDefaultSmsProvider}
              options={[
                { value: 'TWILIO', label: 'Twilio' },
                { value: 'MSG91', label: 'MSG91' },
                { value: 'TEXTLOCAL', label: 'TextLocal' },
                { value: 'CUSTOM', label: 'Custom Provider' },
              ]}
              placeholder="Select SMS provider"
            />

            {/* Twilio */}
            {defaultSmsProvider === 'TWILIO' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 rounded-lg border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-teal-600 text-white">Twilio</Badge>
                  <span className="text-xs text-muted-foreground">
                    Configure your Twilio credentials
                  </span>
                </div>
                <TextField
                  label="Account SID"
                  value={twilioAccountSid}
                  onChange={setTwilioAccountSid}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  icon={Key}
                />
                <TextField
                  label="Auth Token"
                  value={twilioAuthToken}
                  onChange={setTwilioAuthToken}
                  type="password"
                  placeholder="Your Twilio auth token"
                  icon={Lock}
                />
                <TextField
                  label="Phone Number"
                  value={twilioPhoneNumber}
                  onChange={setTwilioPhoneNumber}
                  placeholder="+1234567890"
                  icon={Phone}
                />
              </motion.div>
            )}

            {/* MSG91 */}
            {defaultSmsProvider === 'MSG91' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white">MSG91</Badge>
                  <span className="text-xs text-muted-foreground">
                    Configure your MSG91 credentials
                  </span>
                </div>
                <TextField
                  label="Auth Key"
                  value={msg91AuthKey}
                  onChange={setMsg91AuthKey}
                  type="password"
                  placeholder="Your MSG91 auth key"
                  icon={Key}
                />
                <TextField
                  label="Sender ID"
                  value={msg91SenderId}
                  onChange={setMsg91SenderId}
                  placeholder="HOSPIT"
                />
              </motion.div>
            )}

            {/* TextLocal */}
            {defaultSmsProvider === 'TEXTLOCAL' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600 text-white">TextLocal</Badge>
                  <span className="text-xs text-muted-foreground">
                    Configure your TextLocal credentials
                  </span>
                </div>
                <TextField
                  label="API Key"
                  value={textlocalApiKey}
                  onChange={setTextlocalApiKey}
                  type="password"
                  placeholder="Your TextLocal API key"
                  icon={Key}
                />
                <TextField
                  label="Sender"
                  value={textlocalSender}
                  onChange={setTextlocalSender}
                  placeholder="HOSPIT"
                />
              </motion.div>
            )}

            {/* Custom */}
            {defaultSmsProvider === 'CUSTOM' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-950/20"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">Custom</Badge>
                  <span className="text-xs text-muted-foreground">
                    Configure a custom SMS gateway integration
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Custom provider settings can be configured through the Integration tab
                  using webhooks.
                </p>
              </motion.div>
            )}

            <Separator />

            {/* SMS Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">SMS Options</h4>
              <SwitchField
                label="Auto-send SMS after appointments"
                description="Automatically send survey SMS when an appointment is completed"
                checked={autoSendSms}
                onChange={setAutoSendSms}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Retry Count"
                  description="Number of retry attempts for failed SMS"
                  value={smsRetryCount}
                  onChange={setSmsRetryCount}
                  placeholder="3"
                />
                <TextField
                  label="Retry Interval (min)"
                  description="Minutes between retry attempts"
                  value={smsRetryInterval}
                  onChange={setSmsRetryInterval}
                  placeholder="5"
                />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── Security Tab ────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-6">
          {/* Authentication */}
          <SectionCard
            icon={Shield}
            title="Authentication & Sessions"
            description="Control login security and session management"
            onSave={saveSecurity}
            saving={savingSection === 'Security'}
          >
            <TextField
              label="Session Timeout (min)"
              description="Duration of inactivity before automatic logout"
              value={sessionTimeout}
              onChange={setSessionTimeout}
              placeholder="30"
              icon={Clock}
            />
            <TextField
              label="Max Login Attempts"
              description="Account lockout after this many failed attempts"
              value={maxLoginAttempts}
              onChange={setMaxLoginAttempts}
              placeholder="5"
            />
          </SectionCard>

          {/* Password Policy */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <Card className="rounded-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Lock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Password Policy</CardTitle>
                    <CardDescription>
                      Configure password requirements for users
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <TextField
                  label="Minimum Password Length"
                  description="Minimum number of characters required"
                  value={passwordMinLength}
                  onChange={setPasswordMinLength}
                  placeholder="8"
                />
                <SwitchField
                  label="Require Special Characters"
                  description="Passwords must contain at least one special character (!@#$%^&*)"
                  checked={requireSpecialChars}
                  onChange={setRequireSpecialChars}
                />
                <SwitchField
                  label="Two-Factor Authentication"
                  description="Require 2FA for all admin accounts"
                  checked={twoFactorAuth}
                  onChange={setTwoFactorAuth}
                />
                <Separator className="my-2" />
                <div className="flex justify-end">
                  <Button
                    onClick={saveSecurity}
                    disabled={isSaving}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {savingSection === 'Security' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingSection === 'Security' ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* IP Whitelist */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <Card className="rounded-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                    <Globe className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Network Security</CardTitle>
                    <CardDescription>
                      Restrict access by IP address
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <IpWhitelistEditor value={ipWhitelist} onChange={setIpWhitelist} />
                <Separator className="my-2" />
                <div className="flex justify-end">
                  <Button
                    onClick={saveSecurity}
                    disabled={isSaving}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {savingSection === 'Security' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingSection === 'Security' ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── Integration Tab ─────────────────────────────────────────── */}
        <TabsContent value="integration" className="space-y-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <Card className="rounded-xl">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center max-w-md mx-auto">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/15 mb-4">
                    <Link2 className="h-8 w-8 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Integrations</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Integration features are coming soon. We&apos;re working on connecting your hospital survey system with external software and services.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {['Concept Software API', 'Webhooks', 'Data Synchronization', 'Custom API Endpoints', 'Real-time Event Streaming'].map((feature) => (
                      <Badge key={feature} variant="secondary" className="px-3 py-1.5 text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <div className="w-full rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      We&apos;ll notify you when integrations are ready. Stay tuned!
                    </p>
                  </div>
                  <Badge variant="outline" className="mt-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 px-4 py-1.5">
                    Coming Soon
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── Survey Tab ──────────────────────────────────────────────── */}
        <TabsContent value="survey" className="space-y-6">
          <SectionCard
            icon={ClipboardList}
            title="Survey Defaults"
            description="Default settings for new surveys"
            onSave={saveSurvey}
            saving={savingSection === 'Survey'}
          >
            <SwitchField
              label="Default Anonymous Mode"
              description="New surveys default to anonymous responses"
              checked={defaultAnonymous}
              onChange={setDefaultAnonymous}
            />
            <TextField
              label="Minimum Questions Required"
              description="Minimum number of questions a survey must have to be published"
              value={minQuestions}
              onChange={setMinQuestions}
              placeholder="3"
            />
            <TextField
              label="Auto-Close After (days)"
              description="Surveys will automatically close after this many days (0 = never)"
              value={autoCloseDays}
              onChange={setAutoCloseDays}
              placeholder="30"
              icon={Clock}
            />
            <TextField
              label="Survey Link Base URL"
              description="Base URL used for generating survey share links"
              value={surveyLinkBaseUrl}
              onChange={setSurveyLinkBaseUrl}
              placeholder="https://survey.hospital.com"
              icon={Globe}
            />
          </SectionCard>
        </TabsContent>

        {/* ─── Roles & Permissions Tab ──────────────────────────────────── */}
        {/* Roles & Permissions Tab - only SUPER_ADMIN */}
        {isSuperAdmin && (
        <TabsContent value="roles" className="space-y-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <Card className="rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                      <UserCog className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Roles &amp; Permissions</CardTitle>
                      <CardDescription>Configure permissions for each role in the system</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadRoles}
                    disabled={rolesLoading}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${rolesLoading ? 'animate-spin' : ''}`} />
                    Reload
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rolesLoading && roles.length === 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 w-28" />
                        <div className="flex gap-3">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <Skeleton key={j} className="h-6 w-6 rounded-full" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Info: Patient Dashboard */}
                    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <Heart className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Patient &amp; Employee Dashboards</span>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                          Users with <strong>Patient</strong> or <strong>Employee</strong> role are automatically redirected to their own dedicated dashboard — they do NOT see the admin panel. Patient users see only patient surveys; Employee users see only employee surveys.
                        </p>
                      </div>
                    </div>

                    {/* SUPER_ADMIN full access row */}
                    <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3 dark:border-teal-900/50 dark:bg-teal-950/20">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white">
                        <Shield className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">Super Admin</span>
                      </div>
                      <Badge className="bg-teal-600 text-white border-0 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Full Access
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-1">Non-editable</span>
                    </div>

                    {/* Role column headers */}
                    <div className="overflow-x-auto">
                      <div className="min-w-[700px]">
                        <div className="grid grid-cols-[1fr_repeat(6,56px)] gap-1 items-center pb-2 border-b">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                            Permission
                          </div>
                          {EDITABLE_ROLES.map((roleKey) => (
                            <div key={roleKey} className="flex justify-center">
                              <Badge
                                className={`text-[10px] px-1.5 py-0.5 border-0 font-medium ${ROLE_COLORS[roleKey] || 'bg-muted text-muted-foreground'}`}
                              >
                                {ROLE_LABELS[roleKey] || roleKey}
                              </Badge>
                            </div>
                          ))}
                        </div>

                        {/* Permission groups */}
                        {PERMISSION_GROUPS.map((group) => {
                          const editableRolesData = roles.filter(
                            (r) => EDITABLE_ROLES.includes(r.name)
                          )
                          return (
                            <div key={group.name} className="mt-3 first:mt-0">
                              {/* Group header */}
                              <div className="grid grid-cols-[1fr_repeat(6,56px)] gap-1 items-center py-1.5">
                                <div className="flex items-center gap-2 px-2">
                                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    {group.name}
                                  </span>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span className="text-[10px] text-muted-foreground">
                                    {group.permissions.length} permission{group.permissions.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                {editableRolesData.map((role) => {
                                  const perms = rolePermissions[role.id] || []
                                  const allEnabled = group.permissions.every((p) =>
                                    perms.includes(p.key)
                                  )
                                  const someEnabled = group.permissions.some((p) =>
                                    perms.includes(p.key)
                                  )
                                  return (
                                    <div key={role.id} className="flex justify-center">
                                      <button
                                        type="button"
                                        onClick={() => toggleGroupForRole(role, group, !allEnabled)}
                                        className={`h-5 w-5 rounded border-2 transition-all flex items-center justify-center ${
                                          allEnabled
                                            ? 'bg-teal-500 border-teal-500 text-white'
                                            : someEnabled
                                              ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/30'
                                              : 'border-muted-foreground/30 bg-transparent hover:border-teal-400'
                                        }`}
                                        title={`${allEnabled ? 'Deselect' : 'Select'} all ${group.name} for ${ROLE_LABELS[role.name] || role.name}`}
                                      >
                                        {allEnabled && (
                                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        )}
                                        {someEnabled && !allEnabled && (
                                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-teal-500" fill="currentColor">
                                            <rect x="6" y="11" width="12" height="2" rx="1" />
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Individual permissions */}
                              {group.permissions.map((perm) => (
                                <div
                                  key={perm.key}
                                  className="grid grid-cols-[1fr_repeat(6,56px)] gap-1 items-center py-1.5 hover:bg-muted/30 rounded-md transition-colors group"
                                >
                                  <div className="px-2 pl-4">
                                    <div className="text-sm font-medium text-foreground leading-tight">
                                      {perm.label}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground leading-tight">
                                      {perm.description}
                                    </div>
                                  </div>
                                  {editableRolesData.map((role) => {
                                    const perms = rolePermissions[role.id] || []
                                    const isChecked = perms.includes(perm.key)
                                    const isChanged = changedRoles.has(role.id)
                                    return (
                                      <div key={role.id} className="flex justify-center">
                                        <motion.div
                                          whileTap={{ scale: 0.9 }}
                                          className="relative"
                                        >
                                          <Switch
                                            checked={isChecked}
                                            onCheckedChange={() => togglePermission(role.id, perm.key)}
                                            className={`data-[state=checked]:bg-teal-500 ${
                                              isChanged ? 'ring-2 ring-teal-300 ring-offset-1' : ''
                                            }`}
                                          />
                                        </motion.div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Save row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {changedRoles.size > 0 && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400"
                          >
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            {changedRoles.size} role{changedRoles.size > 1 ? 's' : ''} modified
                          </motion.div>
                        )}
                      </div>
                      <Button
                        onClick={saveRoles}
                        disabled={savingRoles || changedRoles.size === 0}
                        className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        {savingRoles ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {savingRoles ? 'Saving...' : 'Save All Permissions'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        )}
      </Tabs>
    </motion.div>
  )
}

export default SettingsPage
