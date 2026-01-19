import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/feedback/unread-count - Get count of unread/new feedbacks (admin only)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Check if user is super admin
    const isSuperAdmin = await prisma.superAdmin.findUnique({
      where: { userId: session.user.id }
    })

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Count new feedbacks (not yet viewed by admin)
    const newFeedbacksCount = await prisma.feedback.count({
      where: {
        viewedAt: null,
      },
    })

    // Find feedbacks with unread messages (messages created after lastAdminReadAt)
    const allFeedbacks = await prisma.feedback.findMany({
      where: {
        viewedAt: { not: null }, // Only check viewed feedbacks for unread messages
      },
      select: {
        id: true,
        lastAdminReadAt: true,
        messages: {
          where: {
            authorType: 'user',
          },
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Just get the most recent user message
        },
      },
    })

    // Filter feedbacks that have unread messages
    const feedbacksWithUnreadMessages = allFeedbacks.filter((feedback) => {
      if (feedback.messages.length === 0) return false
      const lastUserMessage = feedback.messages[0]
      // If no lastAdminReadAt, or last user message is after lastAdminReadAt
      return !feedback.lastAdminReadAt || lastUserMessage.createdAt > feedback.lastAdminReadAt
    })

    const count = newFeedbacksCount + feedbacksWithUnreadMessages.length

    return NextResponse.json({ count })
  } catch (error) {
    logger.error('Error fetching unread count:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du nombre de feedbacks non lus' },
      { status: 500 }
    )
  }
}
