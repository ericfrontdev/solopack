import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import PaymentAgreementEmail from '@/emails/payment-agreement-email'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)
const PAYMENT_AGREEMENT_FROM_EMAIL = process.env.PAYMENT_AGREEMENT_FROM_EMAIL || process.env.EMAIL_FROM || 'agreements@solopack.app'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    // Récupérer l'entente avec les informations du projet et du client
    const agreement = await prisma.paymentAgreement.findUnique({
      where: { token },
      include: {
        project: {
          include: {
            client: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!agreement) {
      return NextResponse.json(
        { error: 'Entente introuvable' },
        { status: 404 }
      )
    }

    if (agreement.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Cette entente a déjà été confirmée' },
        { status: 400 }
      )
    }

    const totalAmount = agreement.amountPerInstallment * agreement.numberOfInstallments
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agreements/${token}/confirm`

    // Renvoyer l'email
    await resend.emails.send({
      from: PAYMENT_AGREEMENT_FROM_EMAIL,
      to: agreement.project.client.email,
      subject: `Entente de paiement - ${agreement.project.name}`,
      react: PaymentAgreementEmail({
        projectName: agreement.project.name,
        description: agreement.project.description || '',
        totalAmount,
        numberOfInstallments: agreement.numberOfInstallments,
        amountPerInstallment: agreement.amountPerInstallment,
        frequency: agreement.frequency,
        confirmUrl,
      }),
    })

    return NextResponse.json({
      message: 'Entente renvoyée avec succès',
    })
  } catch (error) {
    logger.error('Error resending agreement:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'envoi de l\'entente' },
      { status: 500 }
    )
  }
}
