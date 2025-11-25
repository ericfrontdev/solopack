import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token et mot de passe requis' },
        { status: 400 }
      )
    }

    // Validation du mot de passe
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Vérifier si le token existe et n'est pas expiré
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 400 }
      )
    }

    // Vérifier si le token n'est pas expiré
    if (new Date() > resetToken.expires) {
      // Supprimer le token expiré
      await prisma.passwordResetToken.delete({
        where: { token },
      })

      return NextResponse.json(
        { error: 'Ce lien a expiré. Veuillez demander un nouveau lien de réinitialisation.' },
        { status: 400 }
      )
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    })

    // Supprimer le token utilisé
    await prisma.passwordResetToken.delete({
      where: { token },
    })

    // Optionnel : Supprimer toutes les sessions actives pour forcer une reconnexion
    await prisma.session.deleteMany({
      where: { userId: user.id },
    })

    return NextResponse.json({
      message: 'Mot de passe réinitialisé avec succès',
    })
  } catch (error) {
    console.error('Error in reset-password:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
