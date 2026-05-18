import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  role: {
    id: string
    name: string
    displayName: string
    permissions: string[]
  }
  department?: {
    id: string
    name: string
    code: string
  }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),
    }),
    {
      name: 'hospital-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

// Active page navigation
export type PageId = 
  | 'dashboard' 
  | 'surveys' 
  | 'survey-builder' 
  | 'survey-responses'
  | 'take-survey'
  | 'users' 
  | 'departments' 
  | 'sms' 
  | 'appointments'
  | 'reports' 
  | 'audit-logs' 
  | 'notifications' 
  | 'settings'

interface AppState {
  activePage: PageId
  sidebarOpen: boolean
  selectedSurveyId: string | null
  selectedDepartmentId: string | null
  setActivePage: (page: PageId) => void
  setSidebarOpen: (open: boolean) => void
  setSelectedSurveyId: (id: string | null) => void
  setSelectedDepartmentId: (id: string | null) => void
}

export const useAppStore = create<AppState>()((set) => ({
  activePage: 'dashboard',
  sidebarOpen: true,
  selectedSurveyId: null,
  selectedDepartmentId: null,
  setActivePage: (page) => set({ activePage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedSurveyId: (id) => set({ selectedSurveyId: id }),
  setSelectedDepartmentId: (id) => set({ selectedDepartmentId: id }),
}))
