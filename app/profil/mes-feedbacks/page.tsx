import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserFeedbacksPageClient } from '@/components/pages/user-feedbacks-page-client'
import { logger } from '@/lib/logger'

async function getUserFeedbacks(userId: string) {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        type: true,
        severity: true,
        title: true,
        status: true,
        createdAt: true,
        lastUserReadAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
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
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculer s'il y a des messages non lus
    const feedbacksWithUnread = feedbacks.map(feedback => {
      const hasUnreadMessages =
        feedback.messages.length > 0 &&
        (!feedback.lastUserReadAt ||
         new Date(feedback.messages[0].createdAt) > new Date(feedback.lastUserReadAt))

      return {
        ...feedback,
        hasUnreadMessages,
      }
    })

    const stats = {
      total: feedbacksWithUnread.length,
      new: feedbacksWithUnread.filter((f) => f.status === 'new').length,
      in_progress: feedbacksWithUnread.filter((f) => f.status === 'in_progress').length,
      resolved: feedbacksWithUnread.filter((f) => f.status === 'resolved').length,
      bugs: feedbacksWithUnread.filter((f) => f.type === 'bug').length,
      features: feedbacksWithUnread.filter((f) => f.type === 'feature').length,
    }

    return { feedbacks: feedbacksWithUnread, stats }
  } catch (error) {
    logger.error('Error fetching user feedbacks:', error)
    return null
  }
}

export default async function UserFeedbackPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const data = await getUserFeedbacks(session.user.id)

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Erreur lors du chargement des feedbacks</p>
      </div>
    )
  }

  return <UserFeedbacksPageClient feedbacks={data.feedbacks} stats={data.stats} />
}
