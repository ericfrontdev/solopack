'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useTranslation } from '@/lib/i18n-context'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { ThemeLogo } from '@/components/theme-logo'
import { UserMenu } from '@/components/user-menu'
import { UserNotificationBadge } from '@/components/user-notification-badge'
import { AdminNotificationBadge } from '@/components/admin-notification-badge'
import { LanguageSelector } from '@/components/language-selector'
import { NotificationDropdown } from '@/components/notification-dropdown'

export function Navigation({
  user,
  isSuperAdmin,
}: {
  user?: { name: string; email: string; image?: string | null }
  isSuperAdmin?: boolean
}) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <nav className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex-shrink-0"
            >
              <ThemeLogo
                width={180}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-baseline space-x-4">
                <Link
                  href="/"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  href="/clients"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.clients')}
                </Link>
                <Link
                  href="/projets"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.projects')}
                </Link>
                <Link
                  href="/invoices"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.invoices')}
                </Link>
                <Link
                  href="/accounting"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.accounting')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0"
          >
            <ThemeLogo
              width={180}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center flex-1">
            {user && (
              <div className="flex items-baseline space-x-4">
                <Link
                  href="/"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.dashboard')}
                </Link>

                <Link
                  href="/clients"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.clients')}
                </Link>
                <Link
                  href="/invoices"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.invoices')}
                </Link>
                <Link
                  href="/projets"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.projects')}
                </Link>

                <Link
                  href="/crm"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.crm')}
                </Link>
                <Link
                  href="/accounting"
                  className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-md"
                >
                  {t('nav.accounting')}
                </Link>
              </div>
            )}

            {/* Right side items */}
            <div className="ml-auto flex items-center gap-3">
              {/* Language Selector */}
              <LanguageSelector />

              {/* Notification Dropdown */}
              {user && <NotificationDropdown />}

              {/* Feedback Notification Badge */}
              {user && !isSuperAdmin && <UserNotificationBadge />}
              {user && isSuperAdmin && <AdminNotificationBadge />}

              {/* Theme Toggle */}
              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTheme(theme === 'light' ? 'dark' : 'light')
                }}
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>

              {user && (
                <UserMenu
                  user={user}
                  isSuperAdmin={isSuperAdmin || false}
                />
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && <NotificationDropdown />}
            {user && !isSuperAdmin && <UserNotificationBadge />}
            {user && isSuperAdmin && <AdminNotificationBadge />}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTheme(theme === 'light' ? 'dark' : 'light')
              }}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/"
                className="block px-3 py-2 text-base font-medium hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/clients"
                className="block px-3 py-2 text-base font-medium hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.clients')}
              </Link>
              <Link
                href="/invoices"
                className="block px-3 py-2 text-base font-medium hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.invoices')}
              </Link>
              <Link
                href="/projets"
                className="block px-3 py-2 text-base font-medium hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.projects')}
              </Link>
              <Link
                href="/crm"
                className="block px-3 py-2 text-base font-medium hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.crm')}
              </Link>
              <Link
                href="/accounting"
                className="block px-3 py-2 text-base font-medium hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.accounting')}
              </Link>
            </div>

            {/* Language selector in mobile menu */}
            <div className="border-t px-2 py-3">
              <div className="flex items-center justify-between px-3">
                <span className="text-sm font-medium">{t('common.language') || 'Langue'}</span>
                <LanguageSelector />
              </div>
            </div>

            {/* User section in mobile menu */}
            {user && (
              <div className="border-t px-2 pt-3 pb-3">
                <UserMenu
                  user={user}
                  isSuperAdmin={isSuperAdmin || false}
                  onProfileClick={() => setIsMenuOpen(false)}
                  isMobile={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
