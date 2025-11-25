'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeLogo } from '@/components/theme-logo'
import { useTranslation } from '@/lib/i18n-context'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const params = useParams()
  const token = params?.token as string
  const router = useRouter()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation côté client
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'))
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Rediriger vers la page de login après 2 secondes
        setTimeout(() => {
          router.push('/auth/login?reset=success')
        }, 2000)
      } else {
        setError(data.error || t('auth.errorOccurred'))
      }
    } catch {
      setError(t('auth.errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col bg-background rounded-xl border shadow-lg p-8">
          <ThemeLogo className="mb-6 w-auto" />

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{t('auth.resetPassword')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('auth.resetPasswordDescription')}
            </p>
          </div>

          {success && (
            <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-300">
                {t('auth.passwordResetSuccess')}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                {t('auth.redirectingToLogin')}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                >
                  {t('auth.newPassword')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('auth.passwordMinLength')}
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium mb-2"
                >
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? t('auth.resetting') : t('auth.resetPasswordButton')}
              </Button>
            </form>
          )}

          {!success && (
            <div className="mt-6">
              <Link
                href="/auth/login"
                className="flex items-center justify-center text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {t('auth.backToLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
