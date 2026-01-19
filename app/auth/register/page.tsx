'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { signIn } from 'next-auth/react'
import { ThemeLogo } from '@/components/theme-logo'
import { useTranslation } from '@/lib/i18n-context'
import { AlertCircle } from 'lucide-react'
import { logger } from '@/lib/logger'

export default function RegisterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [checkingBeta, setCheckingBeta] = useState(true)

  // Vérifier le statut du beta au chargement
  useEffect(() => {
    const checkBetaStatus = async () => {
      try {
        const res = await fetch('/api/auth/beta-status')
        const data = await res.json()
        setRegistrationOpen(data.registrationOpen)

        // Rediriger vers la waitlist si les inscriptions sont fermées
        if (!data.registrationOpen) {
          router.push('/waitlist')
        }
      } catch (error) {
        logger.error('Error checking beta status:', error)
        // En cas d'erreur, autoriser l'inscription
        setRegistrationOpen(true)
      } finally {
        setCheckingBeta(false)
      }
    }

    checkBetaStatus()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Si l'erreur est une clé de traduction, on la traduit
        const errorKey = data.error
        const errorMessage = errorKey?.startsWith('auth.')
          ? t(errorKey)
          : (errorKey || t('errors.generic'))
        setError(errorMessage)
        setLoading(false)
        return
      }

      // Auto-login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t('auth.registerSuccessLoginError'))
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-xl border shadow-lg p-8">
          <div className="flex justify-center">
            <ThemeLogo className="mb-6 w-auto" />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{t('auth.register')}</h1>
            <p className="text-muted-foreground mt-2">{t('auth.createAccount')}</p>
          </div>

          {/* Message si les inscriptions sont fermées */}
          {!checkingBeta && !registrationOpen && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('auth.betaLimitReached')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('auth.registrationsClosed')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-2"
              >
                {t('auth.fullName')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!registrationOpen}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
              >
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!registrationOpen}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!registrationOpen}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2"
              >
                {t('auth.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!registrationOpen}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !registrationOpen}
            >
              {loading ? t('auth.registering') : t('auth.signUp')}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading || !registrationOpen}
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link
              href="/auth/login"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
