import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

// GET /api/reminders - Récupérer l'historique global des rappels
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    // Récupérer tous les rappels pour les factures de l'utilisateur
    const reminders = await prisma.invoiceReminder.findMany({
      where: {
        invoice: {
          client: {
            userId: session.user.id,
          },
        },
      },
      include: {
        invoice: {
          select: {
            number: true,
            total: true,
            client: {
              select: {
                name: true,
                company: true,
              },
            },
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    logger.error('[reminders:GET] Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des rappels.' }, { status: 500 })
  }
}
