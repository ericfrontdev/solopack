import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/feedback/user-unread-count - Get count of feedbacks with unread admin messages (for regular users)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Find user's feedbacks with unread admin messages
    const userFeedbacks = await prisma.feedback.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        lastUserReadAt: true,
        messages: {
          where: {
            authorType: 'admin',
          },
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Just get the most recent admin message
        },
      },
    })

    // Filter feedbacks that have unread admin messages
    const feedbacksWithUnreadMessages = userFeedbacks.filter((feedback) => {
      if (feedback.messages.length === 0) return false
      const lastAdminMessage = feedback.messages[0]
      // If no lastUserReadAt, or last admin message is after lastUserReadAt
      return !feedback.lastUserReadAt || lastAdminMessage.createdAt > feedback.lastUserReadAt
    })

    const count = feedbacksWithUnreadMessages.length

    return NextResponse.json({ count })
  } catch (error) {
    logger.error('Error fetching user unread count:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du nombre de messages non lus' },
      { status: 500 }
    )
  }
}
