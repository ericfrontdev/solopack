import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = session.user.id

    // Supprimer toutes les données de l'utilisateur
    // Prisma gère les cascades automatiquement grâce à onDelete: Cascade

    await prisma.user.delete({
      where: { id: userId },
    })

    // TODO: Appeler l'API Helcim pour annuler l'abonnement si actif
    // TODO: Supprimer les fichiers uploadés (logo, documents) de Cloudinary

    return NextResponse.json({
      success: true,
      message: 'Compte supprimé avec succès',
    })
  } catch (error) {
    logger.error('Erreur lors de la suppression du compte:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
