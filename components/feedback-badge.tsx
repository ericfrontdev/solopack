'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { logger } from '@/lib/logger'

export function FeedbackBadge({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

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

  useEffect(() => {
    if (!isSuperAdmin) return

    fetchUnreadCount()

    // Si on est sur la page feedback, rafraîchir plus souvent (2 secondes)
    // Sinon rafraîchir toutes les 30 secondes
    const refreshInterval = pathname?.includes('/admin/feedback') ? 2000 : 30000
    const interval = setInterval(fetchUnreadCount, refreshInterval)

    return () => clearInterval(interval)
  }, [isSuperAdmin, pathname]) // Rafraîchir quand la route change

  if (!isSuperAdmin) return null

  return (
    <Link href="/admin/feedback" onClick={fetchUnreadCount}>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer relative"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  )
}
