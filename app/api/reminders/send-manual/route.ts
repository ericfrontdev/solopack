import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { Resend } from 'resend'
import { getReminderEmailHtml, getReminderSubject } from '@/lib/reminder-email-templates'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/reminders/send-manual - Envoyer un rappel manuel
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const { invoiceId, type } = await req.json()

    if (!invoiceId || !type) {
      return NextResponse.json({ error: 'invoiceId et type requis.' }, { status: 400 })
    }

    // Valider le type
    const validTypes = ['reminder1', 'reminder2', 'reminder3', 'mise_en_demeure']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type de rappel invalide.' }, { status: 400 })
    }

    // Récupérer la facture
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        client: {
          userId: session.user.id,
        },
      },
      include: {
        client: {
          select: {
            name: true,
            company: true,
            email: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable.' }, { status: 404 })
    }

    // Vérifier que la facture est en statut "sent"
    if (invoice.status !== 'sent') {
      return NextResponse.json({ error: 'Seules les factures envoyées peuvent recevoir des rappels.' }, { status: 400 })
    }

    // Vérifier que la facture a une date d'échéance
    if (!invoice.dueDate) {
      return NextResponse.json({ error: 'La facture doit avoir une date d\'échéance.' }, { status: 400 })
    }

    // Récupérer les paramètres de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        autoRemindersEnabled: true,
        reminderMiseEnDemeureTemplate: true,
        email: true,
        company: true,
        name: true,
        logo: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
    }

    // Vérifier que les rappels auto ne sont pas activés
    if (user.autoRemindersEnabled) {
      return NextResponse.json({ error: 'Les rappels manuels ne sont pas disponibles quand les rappels automatiques sont activés.' }, { status: 400 })
    }

    try {
      // Préparer l'email
      const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${invoice.id}/pay`
      const userCompany = user.company || user.name
      const clientName = invoice.client.company || invoice.client.name

      const emailHtml = getReminderEmailHtml({
        type,
        invoiceNumber: invoice.number,
        clientName,
        amount: invoice.total,
        dueDate: invoice.dueDate,
        paymentUrl,
        userCompany,
        userLogo: user.logo,
        customMessage:
          type === 'mise_en_demeure'
            ? user.reminderMiseEnDemeureTemplate || undefined
            : undefined,
      })

      const subject = getReminderSubject(type, invoice.number)

      // Envoyer l'email
      await resend.emails.send({
        from: `${userCompany} <${user.email}>`,
        to: invoice.client.email,
        subject,
        html: emailHtml,
      })

      // Enregistrer le rappel dans la base de données
      const reminder = await prisma.invoiceReminder.create({
        data: {
          invoiceId: invoice.id,
          type,
          sentTo: invoice.client.email,
          status: 'sent',
        },
      })

      return NextResponse.json({
        success: true,
        reminder,
      })
    } catch (error) {
      logger.error(`[reminders:send-manual] Error sending reminder:`, error)

      // Enregistrer l'erreur
      await prisma.invoiceReminder.create({
        data: {
          invoiceId: invoice.id,
          type,
          sentTo: invoice.client.email,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      return NextResponse.json({ error: 'Erreur lors de l\'envoi du rappel.' }, { status: 500 })
    }
  } catch (error) {
    logger.error('[reminders:send-manual] Error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du rappel.' }, { status: 500 })
  }
}
