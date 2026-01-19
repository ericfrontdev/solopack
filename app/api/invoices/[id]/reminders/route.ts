import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

// GET /api/invoices/[id]/reminders - Récupérer les rappels d'une facture
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que la facture appartient à l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        client: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        dueDate: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable.' }, { status: 404 })
    }

    // Récupérer les rappels envoyés
    const reminders = await prisma.invoiceReminder.findMany({
      where: {
        invoiceId: id,
      },
      orderBy: {
        sentAt: 'asc',
      },
    })

    // Calculer les dates des rappels programmés
    const scheduledReminders = []
    if (invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate)

      // Rappel 1 (J-3)
      const reminder1Date = new Date(dueDate)
      reminder1Date.setDate(reminder1Date.getDate() - 3)

      // Rappel 2 (J+1)
      const reminder2Date = new Date(dueDate)
      reminder2Date.setDate(reminder2Date.getDate() + 1)

      // Rappel 3 (J+7)
      const reminder3Date = new Date(dueDate)
      reminder3Date.setDate(reminder3Date.getDate() + 7)

      // Mise en demeure (J+14)
      const miseEnDemeureDate = new Date(dueDate)
      miseEnDemeureDate.setDate(miseEnDemeureDate.getDate() + 14)

      scheduledReminders.push(
        { type: 'reminder1', scheduledDate: reminder1Date },
        { type: 'reminder2', scheduledDate: reminder2Date },
        { type: 'reminder3', scheduledDate: reminder3Date },
        { type: 'mise_en_demeure', scheduledDate: miseEnDemeureDate }
      )
    }

    return NextResponse.json({
      sent: reminders,
      scheduled: scheduledReminders,
    })
  } catch (error) {
    logger.error('[invoices/reminders:GET] Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des rappels.' }, { status: 500 })
  }
}
