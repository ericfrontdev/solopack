import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // Récupérer les paramètres système
    const settings = await prisma.systemSettings.findFirst()

    // Si le beta n'est pas activé, les inscriptions sont ouvertes
    if (!settings?.betaEnabled) {
      return NextResponse.json({
        betaEnabled: false,
        registrationOpen: true,
      })
    }

    // Si le beta est activé, vérifier la limite
    const userCount = await prisma.user.count()
    const registrationOpen = userCount < settings.maxBetaUsers

    return NextResponse.json({
      betaEnabled: true,
      registrationOpen,
      currentUsers: userCount,
      maxUsers: settings.maxBetaUsers,
    })
  } catch (error) {
    logger.error('Error checking beta status:', error)
    // En cas d'erreur, autoriser l'inscription par défaut
    return NextResponse.json({
      betaEnabled: false,
      registrationOpen: true,
    })
  }
}
