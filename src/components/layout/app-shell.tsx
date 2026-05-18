'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  MessageSquare,
  Calendar,
  BarChart3,
  FileText,
  Bell,
  Settings,
  Menu,
  Search,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  List,
  Send,
  Stethoscope,
  Heart,
  X,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuthStore, useAppStore, type PageId } from '@/lib/stores'
import { notificationsApi, settingsApi } from '@/lib/api'

interface NavItem {
  id: PageId
  label: string
  icon: React.ElementType
  children?: { id: PageId; label: string; icon: React.ElementType }[]
  requiredPermission?: string // If defined, user must have this permission (or 'all') to see this nav item
}

// Permission-based navigation: each nav item requires a specific permission
// SUPER_ADMIN always has 'all' permissions so always sees everything
const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredPermission: 'view_dashboard' },
  {
    id: 'surveys',
    label: 'Surveys',
    icon: ClipboardList,
    requiredPermission: 'view_surveys',
    children: [
      { id: 'surveys', label: 'Survey List', icon: List },
      { id: 'survey-builder', label: 'Create Survey', icon: PlusCircle },
      { id: 'survey-responses', label: 'Survey Responses', icon: FileText },
    ],
  },
  { id: 'users', label: 'Users', icon: Users, requiredPermission: 'manage_users' },
  { id: 'departments', label: 'Departments', icon: Building2, requiredPermission: 'manage_departments' },
  {
    id: 'sms',
    label: 'SMS',
    icon: MessageSquare,
    requiredPermission: 'send_sms',
    children: [
      { id: 'sms', label: 'Templates', icon: List },
      { id: 'sms', label: 'Send SMS', icon: Send },
      { id: 'sms', label: 'SMS Logs', icon: FileText },
    ],
  },
  { id: 'appointments', label: 'Appointments', icon: Calendar, requiredPermission: 'manage_appointments' },
  { id: 'reports', label: 'Reports', icon: BarChart3, requiredPermission: 'view_reports' },
  { id: 'audit-logs', label: 'Audit Logs', icon: FileText, requiredPermission: 'view_audit_logs' },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings, requiredPermission: 'manage_system' },
]

const pageTitles: Record<PageId, string> = {
  dashboard: 'Dashboard',
  surveys: 'Surveys',
  'survey-builder': 'Survey Builder',
  'survey-responses': 'Survey Responses',
  'take-survey': 'Take Survey',
  users: 'Users',
  departments: 'Departments',
  sms: 'SMS Management',
  appointments: 'Appointments',
  reports: 'Reports',
  'audit-logs': 'Audit Logs',
  notifications: 'Notifications',
  settings: 'Settings',
}

function SidebarNavContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const activePage = useAppStore((s) => s.activePage)
  const setActivePage = useAppStore((s) => s.setActivePage)
  const user = useAuthStore((s) => s.user)
  const [expandedItems, setExpandedItems] = useState<string[]>(['surveys'])

  const userPermissions = user?.role?.permissions || []
  const hasAllPermissions = userPermissions.includes('all')

  // Filter nav items based on user permissions
  const filteredNavItems = navItems.filter((item) => {
    // Notifications are always visible (no permission required)
    if (!item.requiredPermission) return true
    // SUPER_ADMIN has 'all' permissions
    if (hasAllPermissions) return true
    // Check if user has the required permission
    return userPermissions.includes(item.requiredPermission)
  })

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleNavClick = (id: PageId) => {
    setActivePage(id)
    onNavigate?.()
  }

  return (
    <nav className="space-y-1 px-2" role="navigation" aria-label="Main navigation">
      {filteredNavItems.map((item) => {
        const isActive = activePage === item.id
        const isExpanded = expandedItems.includes(item.id)
        const hasChildren = item.children && item.children.length > 0
        const Icon = item.icon

        if (collapsed) {
          return (
            <Tooltip key={item.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(item.id)
                    }
                    handleNavClick(item.id)
                  }}
                  className={`w-full flex items-center justify-center h-10 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        }

        return (
          <div key={item.id}>
            <button
              onClick={() => {
                if (hasChildren) {
                  toggleExpand(item.id)
                }
                handleNavClick(item.id)
              }}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium truncate flex-1 text-left">
                {item.label}
              </span>
              {hasChildren && (
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              )}
            </button>

            {hasChildren && (
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 pl-3 border-l border-sidebar-border/50 space-y-0.5 mt-0.5">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon
                        const isChildActive = activePage === child.id
                        return (
                          <button
                            key={child.label}
                            onClick={() => handleNavClick(child.id)}
                            className={`w-full flex items-center gap-2.5 h-8 px-2 rounded-md transition-all duration-200 text-xs ${
                              isChildActive
                                ? 'bg-white/15 text-white'
                                : 'text-sidebar-foreground/60 hover:bg-white/10 hover:text-white'
                            }`}
                            aria-label={child.label}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const activePage = useAppStore((s) => s.activePage)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [branding, setBranding] = useState<{ hospitalName: string; hospitalLogoUrl: string; hospitalSubtitle: string; footerText: string }>({ hospitalName: 'City General', hospitalLogoUrl: '', hospitalSubtitle: 'Hospital Survey System', footerText: 'Hospital Survey Management System © 2024' })
  // Track client-side mounting for theme toggle icon
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  useEffect(() => {
    if (user?.id) {
      notificationsApi
        .list(user.id)
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res.notifications || []
          const unread = list.filter((n: any) => !n.isRead).length
          setNotificationCount(unread)
        })
        .catch(() => {})
    }
  }, [user?.id])

  // Fetch branding settings for sidebar
  useEffect(() => {
    settingsApi
      .get()
      .then((res: any) => {
        const settings = res.settings || res
        const general = settings.GENERAL || settings.general || {}
        setBranding({
          hospitalName: general.hospitalName || 'City General',
          hospitalLogoUrl: general.hospitalLogoUrl || '',
          hospitalSubtitle: general.hospitalSubtitle || 'Hospital Survey System',
          footerText: general.footerText || 'Hospital Survey Management System © 2024',
        })
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
  }

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(!mobileOpen)
    } else {
      setCollapsed(!collapsed)
      setSidebarOpen(!collapsed)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* Sidebar Header / Branding */}
          <div className="flex items-center gap-3 h-16 px-3 shrink-0">
            {branding.hospitalLogoUrl ? (
              <img
                src={branding.hospitalLogoUrl}
                alt={branding.hospitalName}
                className="w-10 h-10 rounded-xl object-cover shadow-md shrink-0"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-md shrink-0">
                <div className="relative">
                  <Heart className="h-4.5 w-4.5 text-white fill-white/30" />
                  <Stethoscope className="h-3 w-3 text-white absolute -bottom-0.5 -right-1.5" />
                </div>
              </div>
            )}
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden"
              >
                <h2 className="text-sm font-bold text-sidebar-foreground truncate">
                  {branding.hospitalName}
                </h2>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">
                  {branding.hospitalSubtitle}
                </p>
              </motion.div>
            )}
          </div>

          <Separator className="bg-sidebar-border/50" />

          {/* Sidebar Navigation */}
          <ScrollArea className="flex-1 py-3 scrollbar-thin">
            <SidebarNavContent collapsed={collapsed} />
          </ScrollArea>

          {/* Sidebar Footer - Collapse toggle */}
          <div className="p-2 shrink-0">
            <Separator className="bg-sidebar-border/50 mb-2" />
            <button
              onClick={() => {
                setCollapsed(!collapsed)
                setSidebarOpen(!collapsed)
              }}
              className="w-full flex items-center justify-center h-8 rounded-lg text-sidebar-foreground/50 hover:bg-white/10 hover:text-sidebar-foreground transition-all duration-200"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-200 ${
                  collapsed ? 'rotate-0' : 'rotate-180'
                }`}
              />
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
            <SheetHeader className="px-3 pt-3 pb-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex items-center gap-3 h-14">
                {branding.hospitalLogoUrl ? (
                  <img
                    src={branding.hospitalLogoUrl}
                    alt={branding.hospitalName}
                    className="w-10 h-10 rounded-xl object-cover shadow-md"
                  />
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-md">
                    <div className="relative">
                      <Heart className="h-4.5 w-4.5 text-white fill-white/30" />
                      <Stethoscope className="h-3 w-3 text-white absolute -bottom-0.5 -right-1.5" />
                    </div>
                  </div>
                )}
                <div className="overflow-hidden">
                  <h2 className="text-sm font-bold text-sidebar-foreground truncate">
                    {branding.hospitalName}
                  </h2>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">
                    {branding.hospitalSubtitle}
                  </p>
                </div>
              </div>
            </SheetHeader>
            <Separator className="bg-sidebar-border/50" />
            <ScrollArea className="flex-1 py-3 scrollbar-thin">
              <SidebarNavContent
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
            collapsed ? 'lg:ml-16' : 'lg:ml-64'
          }`}
        >
          {/* Top Header */}
          <header className="sticky top-0 z-20 h-16 flex items-center gap-2 sm:gap-4 px-4 border-b bg-background/80 backdrop-blur-md">
            {/* Sidebar Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Page Title */}
            <h1 className="text-lg font-semibold text-foreground truncate hidden sm:block">
              {pageTitles[activePage]}
            </h1>

            {/* Search Bar */}
            <div className="flex-1 max-w-md ml-auto lg:ml-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Search"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
                className="h-9 w-9"
              >
                {mounted && theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => useAppStore.getState().setActivePage('notifications')}
                className="h-9 w-9 relative"
                aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center bg-red-500 text-white border-0">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 h-9 px-2 hover:bg-accent"
                    aria-label="User menu"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-xs font-semibold">
                        {user?.name ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden md:inline-block max-w-[120px] truncate">
                      {user?.name || 'User'}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:inline-block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || ''}
                      </p>
                      {user?.role && (
                        <p className="text-xs leading-none text-teal-600 dark:text-teal-400 font-medium">
                          {user.role.displayName}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => useAppStore.getState().setActivePage('settings')}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => useAppStore.getState().setActivePage('notifications')}
                    className="cursor-pointer"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    {notificationCount > 0 && (
                      <Badge className="ml-auto h-5 min-w-5 px-1.5 text-[10px] bg-red-500 text-white border-0">
                        {notificationCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6">{children}</main>

          {/* Footer */}
          <footer className="mt-auto border-t bg-background/50 py-3 px-4 sm:px-6">
            <p className="text-xs text-center text-muted-foreground">
              {branding.footerText}
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
