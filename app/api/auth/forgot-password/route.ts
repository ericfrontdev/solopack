import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend'
import { render } from '@react-email/components'
import PasswordResetEmail from '@/emails/password-reset-email'
import crypto from 'crypto'
import { rateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function POST(req: Request) {
  // Rate limiting: 3 attempts per 15 minutes per IP
  const clientIp = getClientIp(req)
  const rateLimitResult = rateLimit(clientIp, {
    limit: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Trop de tentatives de réinitialisation. Veuillez réessayer dans quelques minutes.',
  })

  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Pour la sécurité, toujours retourner le même message
    // même si l'utilisateur n'existe pas (évite l'énumération d'emails)
    const rateLimitHeaders = getRateLimitHeaders(clientIp, {
      limit: 3,
      windowMs: 15 * 60 * 1000,
    })

    if (!user) {
      return NextResponse.json(
        {
          message: 'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.',
        },
        { headers: rateLimitHeaders }
      )
    }

    // Vérifier que l'utilisateur a un mot de passe (pas juste Google OAuth)
    if (!user.password) {
      // L'utilisateur utilise probablement Google OAuth
      return NextResponse.json(
        {
          message: 'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.',
        },
        { headers: rateLimitHeaders }
      )
    }

    // Générer un token sécurisé
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 heure

    // Supprimer les anciens tokens pour cet email
    await prisma.passwordResetToken.deleteMany({
      where: { email: email.toLowerCase() },
    })

    // Créer le nouveau token
    await prisma.passwordResetToken.create({
      data: {
        email: email.toLowerCase(),
        token,
        expires,
      },
    })

    // Créer le lien de réinitialisation
    const resetUrl = `${APP_URL}/auth/reset-password/${token}`

    // Envoyer l'email
    const html = await render(
      PasswordResetEmail({
        resetUrl,
        userName: user.name,
      })
    )

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Réinitialisation de votre mot de passe SoloPack',
      html,
    })

    return NextResponse.json(
      {
        message: 'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.',
      },
      { headers: rateLimitHeaders }
    )
  } catch (error) {
    logger.error('Error in forgot-password:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
