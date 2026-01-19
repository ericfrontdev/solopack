'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

export function UserNotificationBadge({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/feedback/user-unread-count')
        const data = await response.json()
        setUnreadCount(data.count || 0)
      } catch (error) {
        logger.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  if (unreadCount === 0) {
    return null
  }

  return (
    <Link
      href="/profil/mes-feedbacks"
      className="relative flex items-center justify-center p-2 cursor-pointer hover:opacity-80 transition-opacity"
      title={`${unreadCount} ${t('feedback.messages').toLowerCase()}${unreadCount > 1 ? 's' : ''} ${t('feedback.unread')}`}
      onClick={onClick}
    >
      <MessageCircle className="h-5 w-5 text-muted-foreground" />
      <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
    </Link>
  )
}
