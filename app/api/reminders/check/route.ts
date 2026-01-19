import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getReminderEmailHtml, getReminderSubject } from '@/lib/reminder-email-templates'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/reminders/check - Vérifier et envoyer les rappels automatiques
export async function POST(req: Request) {
  try {
    // Vérification du token de sécurité pour le cron
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Récupérer toutes les factures "sent" avec une date d'échéance
    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'sent',
        dueDate: {
          not: null,
        },
      },
      include: {
        client: {
          select: {
            name: true,
            company: true,
            email: true,
            userId: true,
            user: {
              select: {
                autoRemindersEnabled: true,
                reminderMiseEnDemeureTemplate: true,
                email: true,
                company: true,
                name: true,
                logo: true,
              },
            },
          },
        },
        reminders: {
          select: {
            type: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
    })

    const results = []

    for (const invoice of invoices) {
      if (!invoice.dueDate) continue

      // Utiliser les paramètres de l'utilisateur déjà chargés (évite N+1 queries)
      const user = invoice.client.user

      // Ignorer si les rappels auto ne sont pas activés
      if (!user?.autoRemindersEnabled) continue

      const dueDate = new Date(invoice.dueDate)
      dueDate.setHours(0, 0, 0, 0)

      // Calculer les dates des rappels
      const reminder1Date = new Date(dueDate)
      reminder1Date.setDate(reminder1Date.getDate() - 3)

      const reminder2Date = new Date(dueDate)
      reminder2Date.setDate(reminder2Date.getDate() + 1)

      const reminder3Date = new Date(dueDate)
      reminder3Date.setDate(reminder3Date.getDate() + 7)

      const miseEnDemeureDate = new Date(dueDate)
      miseEnDemeureDate.setDate(miseEnDemeureDate.getDate() + 14)

      // Vérifier quel rappel envoyer
      let reminderType: string | null = null

      const sentReminderTypes = invoice.reminders.map((r) => r.type)

      if (
        today.getTime() === reminder1Date.getTime() &&
        !sentReminderTypes.includes('reminder1')
      ) {
        reminderType = 'reminder1'
      } else if (
        today.getTime() === reminder2Date.getTime() &&
        !sentReminderTypes.includes('reminder2')
      ) {
        reminderType = 'reminder2'
      } else if (
        today.getTime() === reminder3Date.getTime() &&
        !sentReminderTypes.includes('reminder3')
      ) {
        reminderType = 'reminder3'
      } else if (
        today.getTime() === miseEnDemeureDate.getTime() &&
        !sentReminderTypes.includes('mise_en_demeure')
      ) {
        reminderType = 'mise_en_demeure'
      }

      // Si aucun rappel à envoyer, passer au suivant
      if (!reminderType) continue

      try {
        // Préparer l'email
        const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${invoice.id}/pay`
        const userCompany = user.company || user.name
        const clientName = invoice.client.company || invoice.client.name

        const emailHtml = getReminderEmailHtml({
          type: reminderType,
          invoiceNumber: invoice.number,
          clientName,
          amount: invoice.total,
          dueDate: invoice.dueDate,
          paymentUrl,
          userCompany,
          userLogo: user.logo,
          customMessage:
            reminderType === 'mise_en_demeure'
              ? user.reminderMiseEnDemeureTemplate || undefined
              : undefined,
        })

        const subject = getReminderSubject(reminderType, invoice.number)

        // Envoyer l'email
        await resend.emails.send({
          from: `${userCompany} <${user.email}>`,
          to: invoice.client.email,
          subject,
          html: emailHtml,
        })

        // Enregistrer le rappel dans la base de données
        await prisma.invoiceReminder.create({
          data: {
            invoiceId: invoice.id,
            type: reminderType,
            sentTo: invoice.client.email,
            status: 'sent',
          },
        })

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          type: reminderType,
          status: 'sent',
        })
      } catch (error) {
        logger.error(`[reminders:check] Error sending reminder for invoice ${invoice.id}:`, error)

        // Enregistrer l'erreur
        await prisma.invoiceReminder.create({
          data: {
            invoiceId: invoice.id,
            type: reminderType,
            sentTo: invoice.client.email,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          type: reminderType,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    logger.error('[reminders:check] Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification des rappels.' }, { status: 500 })
  }
}
