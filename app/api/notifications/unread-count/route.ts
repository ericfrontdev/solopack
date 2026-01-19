import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/notifications/unread-count - Get count of unread notifications
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    logger.error('Error fetching unread count:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du nombre de notifications non lues' },
      { status: 500 }
    )
  }
}
