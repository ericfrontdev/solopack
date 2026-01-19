import { resend } from './resend'
import { render } from '@react-email/components'
import FeedbackNotification from '@/emails/feedback-notification'
import FeedbackMessageNotification from '@/emails/feedback-message-notification'
import { prisma } from './prisma'
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function sendFeedbackCreatedNotification(feedbackId: string) {
  try {
    // Get feedback with user data
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!feedback) {
      logger.error('Feedback not found:', feedbackId)
      return { success: false, error: 'Feedback not found' }
    }

    // Get all super admins
    const superAdmins = await prisma.superAdmin.findMany()

    if (superAdmins.length === 0) {
      logger.warn('No super admins found to notify')
      return { success: false, error: 'No admins to notify' }
    }

    // Get user data for each admin
    const adminUsers = await prisma.user.findMany({
      where: {
        id: {
          in: superAdmins.map((admin) => admin.userId),
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    const adminDashboardUrl = `${APP_URL}/admin/feedback`

    // Send email to all admins
    const emailPromises = adminUsers.map(async (admin) => {
      const html = await render(
        FeedbackNotification({
          feedbackId: feedback.id,
          feedbackType: feedback.type,
          feedbackTitle: feedback.title,
          feedbackMessage: feedback.message,
          feedbackSeverity: feedback.severity,
          authorName: feedback.user?.name || feedback.user?.email || 'Utilisateur',
          isAnonymous: feedback.isAnonymous,
          pageUrl: feedback.pageUrl,
          deviceType: feedback.deviceType || undefined,
          adminDashboardUrl,
        })
      )

      return resend.emails.send({
        from: FROM_EMAIL,
        to: admin.email,
        subject: `[SoloPack] Nouveau feedback: ${feedback.title}`,
        html,
      })
    })

    const results = await Promise.allSettled(emailPromises)
    const failures = results.filter((r) => r.status === 'rejected')

    if (failures.length > 0) {
      logger.error('Some emails failed to send:', failures)
    }

    return {
      success: true,
      sent: results.filter((r) => r.status === 'fulfilled').length,
      failed: failures.length,
    }
  } catch (error) {
    logger.error('Error sending feedback notification:', error)
    return { success: false, error }
  }
}

export async function sendFeedbackMessageNotification(
  feedbackId: string,
  messageId: string
) {
  try {
    // Get message with feedback and user data
    const message = await prisma.feedbackMessage.findUnique({
      where: { id: messageId },
      include: {
        feedback: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!message) {
      logger.error('Message not found:', messageId)
      return { success: false, error: 'Message not found' }
    }

    // Determine recipient (if admin sent message, notify user; if user sent, notify admins)
    const isAdminMessage = message.authorType === 'admin'
    const feedbackUrl = isAdminMessage
      ? `${APP_URL}/profil/mes-feedbacks`
      : `${APP_URL}/admin/feedback`

    if (isAdminMessage) {
      // Admin sent message, notify the user (if not anonymous and has email)
      if (message.feedback.isAnonymous || !message.feedback.user?.email) {
        return { success: false, error: 'Anonymous user or no email' }
      }

      const html = await render(
        FeedbackMessageNotification({
          feedbackId: message.feedback.id,
          feedbackTitle: message.feedback.title,
          messageAuthorName: message.author.name || 'Admin',
          messageAuthorType: 'admin',
          messageContent: message.message,
          feedbackUrl,
          recipientName: message.feedback.user.name || 'Utilisateur',
        })
      )

      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: message.feedback.user.email,
        subject: `[SoloPack] Nouveau message sur votre feedback: ${message.feedback.title}`,
        html,
      })

      return { success: true, result }
    } else {
      // User sent message, notify all admins
      const superAdmins = await prisma.superAdmin.findMany()

      if (superAdmins.length === 0) {
        return { success: false, error: 'No admins to notify' }
      }

      // Get user data for each admin
      const adminUsers = await prisma.user.findMany({
        where: {
          id: {
            in: superAdmins.map((admin) => admin.userId),
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      })

      const emailPromises = adminUsers.map(async (admin) => {
        const html = await render(
          FeedbackMessageNotification({
            feedbackId: message.feedback.id,
            feedbackTitle: message.feedback.title,
            messageAuthorName:
              message.author.name || message.author.email || 'Utilisateur',
            messageAuthorType: 'user',
            messageContent: message.message,
            feedbackUrl,
            recipientName: admin.name || 'Admin',
          })
        )

        return resend.emails.send({
          from: FROM_EMAIL,
          to: admin.email,
          subject: `[SoloPack] Nouveau message sur feedback: ${message.feedback.title}`,
          html,
        })
      })

      const results = await Promise.allSettled(emailPromises)
      const failures = results.filter((r) => r.status === 'rejected')

      return {
        success: true,
        sent: results.filter((r) => r.status === 'fulfilled').length,
        failed: failures.length,
      }
    }
  } catch (error) {
    logger.error('Error sending message notification:', error)
    return { success: false, error }
  }
}
