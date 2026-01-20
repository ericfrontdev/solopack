import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * POST /api/webhooks/cleanup
 *
 * Nettoie les logs de webhooks anciens pour éviter la croissance infinie de la table.
 * Cette route doit être appelée par un cron job externe (Vercel Cron, GitHub Actions, etc.)
 *
 * Configuration requise:
 * - Ajouter CRON_SECRET dans .env (même token que pour /api/reminders/check)
 *
 * Politique de rétention:
 * - Logs de succès (200-299): 30 jours
 * - Logs d'erreur (400+): 90 jours (gardés plus longtemps pour le debugging)
 */
export async function POST(req: Request) {
  try {
    // Vérification du token de sécurité pour le cron
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const now = new Date()

    // Nettoyer les logs de succès plus vieux que 30 jours
    const successCutoff = new Date(now)
    successCutoff.setDate(successCutoff.getDate() - 30)

    const deletedSuccess = await prisma.webhookLog.deleteMany({
      where: {
        processedAt: {
          lt: successCutoff,
        },
        status: {
          gte: 200,
          lt: 400,
        },
      },
    })

    logger.info(`[webhooks:cleanup] Deleted ${deletedSuccess.count} success logs older than 30 days`)

    // Nettoyer les logs d'erreur plus vieux que 90 jours
    const errorCutoff = new Date(now)
    errorCutoff.setDate(errorCutoff.getDate() - 90)

    const deletedErrors = await prisma.webhookLog.deleteMany({
      where: {
        processedAt: {
          lt: errorCutoff,
        },
        status: {
          gte: 400,
        },
      },
    })

    logger.info(`[webhooks:cleanup] Deleted ${deletedErrors.count} error logs older than 90 days`)

    // Statistiques après cleanup
    const remainingLogs = await prisma.webhookLog.count()
    const oldestLog = await prisma.webhookLog.findFirst({
      orderBy: { processedAt: 'asc' },
      select: { processedAt: true },
    })

    return NextResponse.json({
      success: true,
      deleted: {
        successLogs: deletedSuccess.count,
        errorLogs: deletedErrors.count,
        total: deletedSuccess.count + deletedErrors.count,
      },
      remaining: remainingLogs,
      oldestLogDate: oldestLog?.processedAt || null,
      policy: {
        successRetention: '30 days',
        errorRetention: '90 days',
      },
    })
  } catch (error) {
    logger.error('[webhooks:cleanup] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage des logs' },
      { status: 500 }
    )
  }
}
