'use client'

import { useEffect, useState, useSyncExternalStore, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAuthStore, useAppStore } from '@/lib/stores'
import { LoginForm } from '@/components/auth/login-form'
import { AppShell } from '@/components/layout/app-shell'
import { PatientDashboard, EmployeeDashboard } from '@/components/respondent/respondent-dashboard'
import { authApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'

// Lazy load page components
const DashboardPage = dynamic(
  () =>
    import('@/components/dashboard/dashboard-page').then((m) => ({
      default: m.default,
    })),
  { ssr: false }
)

const SurveysPage = dynamic(
  () =>
    import('@/components/surveys/surveys-page').then((m) => ({
      default: m.SurveysPage,
    })),
  { ssr: false }
)

const SurveyBuilderPage = dynamic(
  () =>
    import('@/components/surveys/survey-builder-page').then((m) => ({
      default: m.SurveyBuilderPage,
    })),
  { ssr: false }
)

const SurveyResponsesPage = dynamic(
  () =>
    import('@/components/surveys/survey-responses-page').then((m) => ({
      default: m.SurveyResponsesPage,
    })),
  { ssr: false }
)

const TakeSurveyPage = dynamic(
  () =>
    import('@/components/surveys/take-survey-page').then((m) => ({
      default: m.TakeSurveyPage,
    })),
  { ssr: false }
)

const UsersPage = dynamic(
  () =>
    import('@/components/users/users-page').then((m) => ({
      default: m.UsersPage,
    })),
  { ssr: false }
)

const DepartmentsPage = dynamic(
  () =>
    import('@/components/departments/departments-page').then((m) => ({
      default: m.DepartmentsPage,
    })),
  { ssr: false }
)

const SmsPage = dynamic(
  () =>
    import('@/components/sms/sms-page').then((m) => ({
      default: m.SmsPage,
    })),
  { ssr: false }
)

const AppointmentsPage = dynamic(
  () =>
    import('@/components/appointments/appointments-page').then((m) => ({
      default: m.AppointmentsPage,
    })),
  { ssr: false }
)

const ReportsPage = dynamic(
  () =>
    import('@/components/reports/reports-page').then((m) => ({
      default: m.ReportsPage,
    })),
  { ssr: false }
)

const AuditLogsPage = dynamic(
  () =>
    import('@/components/audit-logs/audit-logs-page').then((m) => ({
      default: m.AuditLogsPage,
    })),
  { ssr: false }
)

const NotificationsPage = dynamic(
  () =>
    import('@/components/notifications/notifications-page').then((m) => ({
      default: m.NotificationsPage,
    })),
  { ssr: false }
)

const SettingsPage = dynamic(
  () =>
    import('@/components/settings/settings-page').then((m) => ({
      default: m.SettingsPage,
    })),
  { ssr: false }
)

function PageContent() {
  const activePage = useAppStore((s) => s.activePage)

  switch (activePage) {
    case 'dashboard':
      return <DashboardPage />
    case 'surveys':
      return <SurveysPage />
    case 'survey-builder':
      return <SurveyBuilderPage />
    case 'survey-responses':
      return <SurveyResponsesPage />
    case 'take-survey':
      return <TakeSurveyPage />
    case 'users':
      return <UsersPage />
    case 'departments':
      return <DepartmentsPage />
    case 'sms':
      return <SmsPage />
    case 'appointments':
      return <AppointmentsPage />
    case 'reports':
      return <ReportsPage />
    case 'audit-logs':
      return <AuditLogsPage />
    case 'notifications':
      return <NotificationsPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <DashboardPage />
  }
}

// Empty subscribe function for useSyncExternalStore
const emptySubscribe = () => () => {}

// Custom hook to check if zustand persist has hydrated
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const userRole = useAuthStore((s) => s.user?.role?.name)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const hydrated = useHydrated()
  const [verifying, setVerifying] = useState(true)

  // Verify token on app load
  const verifyAuth = useCallback(async () => {
    if (!token) {
      setVerifying(false)
      return
    }
    try {
      const res = await authApi.me()
      const userData = res.user || res
      login(token, userData)
    } catch {
      logout()
    } finally {
      setVerifying(false)
    }
  }, [token, login, logout])

  useEffect(() => {
    if (hydrated) {
      verifyAuth()
    }
  }, [hydrated, verifyAuth])

  // Show loading spinner while verifying auth
  if (!hydrated || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />
  }

  // AUTHORIZED (Patient) users see Patient Dashboard with PATIENT surveys only
  if (userRole === 'AUTHORIZED') {
    return <PatientDashboard />
  }

  // RESPONDENT (Employee) users see Employee Dashboard with EMPLOYEE surveys only
  if (userRole === 'RESPONDENT') {
    return <EmployeeDashboard />
  }

  // Show the main app shell with page content for admin users
  return (
    <AppShell>
      <PageContent />
    </AppShell>
  )
}
