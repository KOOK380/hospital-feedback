import { useAuthStore } from '@/lib/stores'

const API_BASE = '/api'

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<{ user: any }>('/auth/me'),
}

// Users API
export const usersApi = {
  list: () => apiFetch<{ users: any[] }>('/users'),
  get: (id: string) => apiFetch<{ user: any }>(`/users/${id}`),
  create: (data: any) =>
    apiFetch<{ user: any }>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch<{ user: any }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
}

// Departments API
export const departmentsApi = {
  list: (includeInactive = false) =>
    apiFetch<{ departments: any[] }>(`/departments${includeInactive ? '?all=true' : ''}`),
  create: (data: any) =>
    apiFetch<{ department: any }>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch<{ department: any }>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/departments/${id}`, { method: 'DELETE' }),
}

// Surveys API
export const surveysApi = {
  list: () => apiFetch<{ surveys: any[] }>('/surveys'),
  get: (id: string) => apiFetch<{ survey: any }>(`/surveys/${id}`),
  create: (data: any) =>
    apiFetch<{ survey: any }>('/surveys', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch<{ survey: any }>(`/surveys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/surveys/${id}`, { method: 'DELETE' }),
  responses: (id: string, page = 1, limit = 20) =>
    apiFetch<{ responses: any[]; total: number; page: number; totalPages: number }>(`/surveys/${id}/responses?page=${page}&limit=${limit}`),
  submitResponse: (id: string, data: any) =>
    apiFetch<{ response: any }>(`/surveys/${id}/responses`, { method: 'POST', body: JSON.stringify(data) }),
}

// Analytics API
export const analyticsApi = {
  dashboard: () => apiFetch<any>('/analytics/dashboard'),
  department: (id: string) => apiFetch<any>(`/analytics/department/${id}`),
}

// SMS API
export const smsApi = {
  templates: () => apiFetch<{ templates: any[] }>('/sms/templates'),
  createTemplate: (data: any) =>
    apiFetch<{ template: any }>('/sms/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: string, data: any) =>
    apiFetch<{ template: any }>(`/sms/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) =>
    apiFetch<{ success: boolean }>(`/sms/templates/${id}`, { method: 'DELETE' }),
  send: (data: any) =>
    apiFetch<{ log: any }>('/sms/send', { method: 'POST', body: JSON.stringify(data) }),
  logs: (filters?: { status?: string; departmentId?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.departmentId) params.set('departmentId', filters.departmentId)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    return apiFetch<{ logs: any[]; total: number }>(`/sms/logs?${params.toString()}`)
  },
}

// Notifications API
export const notificationsApi = {
  list: (userId: string) =>
    apiFetch<{ notifications: any[] }>(`/notifications?userId=${userId}`),
  create: (data: any) =>
    apiFetch<{ notification: any }>('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (id: string) =>
    apiFetch<{ notification: any }>(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify({ isRead: true }) }),
}

// Audit Logs API
export const auditLogsApi = {
  list: (filters?: { action?: string; entityType?: string; userId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (filters?.action) params.set('action', filters.action)
    if (filters?.entityType) params.set('entityType', filters.entityType)
    if (filters?.userId) params.set('userId', filters.userId)
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    return apiFetch<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/audit-logs?${params.toString()}`)
  },
}

// Appointments API
export const appointmentsApi = {
  list: () => apiFetch<{ appointments: any[] }>('/appointments'),
  create: (data: any) =>
    apiFetch<{ appointment: any }>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
}

// Settings API
export const settingsApi = {
  get: () => apiFetch<{ settings: any[] }>('/settings'),
  update: (settings: any[]) =>
    apiFetch<{ settings: any[] }>('/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
}

// Roles API
export const rolesApi = {
  list: () => apiFetch<{ roles: any[] }>('/roles'),
  update: (id: string, data: any) =>
    apiFetch<{ role: any }>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}
