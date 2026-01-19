'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n-context'
import { Button } from '@/components/ui/button'
import { useNotifications, useUnreadCount } from '@/hooks/use-notifications'
import { logger } from '@/lib/logger'

export function NotificationDropdown() {
  const { t, locale } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Use SWR hooks
  const { count, mutate: mutateCount } = useUnreadCount()
  const { notifications, isLoading, mutate: mutateNotifications } = useNotifications(10)

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
      })
      if (response.ok) {
        // Optimistically update the cache
        mutateCount({ count: 0 }, false)
        mutateNotifications(
          notifications?.map((notif) => ({ ...notif, read: true })),
          false
        )
      }
    } catch (error) {
      logger.error('Error marking notifications as read:', error)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    )

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      )
      if (diffInMinutes < 1) {
        return t('notifications.justNow') || 'À l\'instant'
      }
      return `${diffInMinutes} ${t('notifications.minutesAgo') || 'min'}`
    } else if (diffInHours < 24) {
      return `${diffInHours} ${t('notifications.hoursAgo') || 'h'}`
    } else {
      return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric',
        month: 'short',
      })
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center p-2 hover:bg-accent rounded-md transition-colors"
        title={t('notifications.title') || 'Notifications'}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-background">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-background border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">
              {t('notifications.title') || 'Notifications'}
            </h3>
            {count > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {t('notifications.markAllRead') || 'Tout marquer comme lu'}
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                {t('common.loading') || 'Chargement...'}
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>{t('notifications.noNotifications') || 'Aucune notification'}</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-accent transition-colors ${
                      !notification.read ? 'bg-accent/50' : ''
                    }`}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          setIsOpen(false)
                          if (!notification.read) {
                            markAllAsRead()
                          }
                        }}
                        className="block"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
