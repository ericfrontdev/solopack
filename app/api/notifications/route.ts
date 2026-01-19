import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/notifications - Get user's notifications
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    logger.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    )
  }
}
