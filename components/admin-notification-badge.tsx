'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

export function AdminNotificationBadge() {
  const { t } = useTranslation()
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/feedback/unread-count')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count)
        }
      } catch (error) {
        logger.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()

    // Si on est sur la page feedback, rafraîchir plus souvent (3 secondes)
    // Sinon rafraîchir toutes les 30 secondes
    const refreshInterval = pathname?.includes('/admin/feedback') ? 3000 : 30000
    const interval = setInterval(fetchUnreadCount, refreshInterval)

    return () => clearInterval(interval)
  }, [pathname]) // Rafraîchir quand la route change

  if (unreadCount === 0) {
    return null
  }

  return (
    <Link
      href="/admin/feedback"
      className="relative flex items-center justify-center p-2 cursor-pointer hover:opacity-80 transition-opacity"
      title={`${unreadCount} feedback${unreadCount > 1 ? 's' : ''} ${t('feedback.unread').toLowerCase()}`}
    >
      <MessageSquare className="h-5 w-5 text-muted-foreground" />
      <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
    </Link>
  )
}
