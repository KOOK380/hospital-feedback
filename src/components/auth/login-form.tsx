'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Stethoscope, Loader2, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore, useAppStore } from '@/lib/stores'
import { authApi } from '@/lib/api'
import { toast } from 'sonner'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [branding, setBranding] = useState<{ hospitalName: string; hospitalLogoUrl: string; hospitalSubtitle: string; footerText: string } | null>(null)

  const login = useAuthStore((s) => s.login)
  const setActivePage = useAppStore((s) => s.setActivePage)

  // Fetch public branding settings (no auth required)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await authApi.login(email, password)
      login(res.token, res.user)
      setActivePage('dashboard')
      toast.success('Welcome back!', {
        description: `Signed in as ${res.user.name}`,
      })
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const hospitalName = branding?.hospitalName || 'City General Hospital'
  const logoUrl = branding?.hospitalLogoUrl || ''
  const hospitalSubtitle = branding?.hospitalSubtitle || 'Hospital Survey System'
  const footerText = branding?.footerText || 'Hospital Survey Management System © 2024'

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-900">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-200/30 dark:bg-teal-800/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 dark:bg-emerald-800/20 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-60 h-60 bg-teal-300/20 dark:bg-teal-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-emerald-300/20 dark:bg-emerald-700/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="border-0 shadow-2xl shadow-teal-900/10 dark:shadow-teal-900/30 backdrop-blur-sm bg-white/80 dark:bg-card/90">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex items-center justify-center"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={hospitalName}
                  className="h-16 w-16 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25">
                  <div className="relative">
                    <Heart className="h-7 w-7 text-white fill-white/30" />
                    <Stethoscope className="h-5 w-5 text-white absolute -bottom-1 -right-2" />
                  </div>
                </div>
              )}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-foreground"
            >
              {hospitalName}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground mt-1 leading-relaxed"
            >
              {hospitalSubtitle}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1"
            >
              Admin Portal
            </motion.p>
          </CardHeader>

          <CardContent>
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {error}
                </motion.div>
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
                  autoComplete="email"
                  className="h-10"
                  aria-label="Email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-10 pr-10"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/20 transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </motion.form>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          {footerText}
        </motion.p>
      </motion.div>
    </div>
  )
}
