import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_FROM = process.env.EMAIL_FROM || 'notifications@solopack.app'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    // Vérifier que l'entente existe et n'est pas déjà confirmée
    const agreement = await prisma.paymentAgreement.findUnique({
      where: { token },
      include: {
        project: {
          include: {
            invoices: {
              orderBy: {
                createdAt: 'asc',
              },
            },
            client: {
              select: {
                name: true,
                userId: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
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

    const confirmationDate = new Date()

    // Mettre à jour l'entente
    await prisma.paymentAgreement.update({
      where: { token },
      data: {
        status: 'confirmed',
        confirmedAt: confirmationDate,
      },
    })

    // Mettre à jour les dates des factures selon le plan de paiement
    const projectInvoices = agreement.project.invoices.filter(
      (inv) => inv.projectId === agreement.projectId
    )

    for (let i = 0; i < projectInvoices.length; i++) {
      const invoice = projectInvoices[i]
      const daysToAdd = i * agreement.frequency
      const dueDate = new Date(confirmationDate)
      dueDate.setDate(dueDate.getDate() + daysToAdd)

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { dueDate },
      })
    }

    // Créer une notification pour l'utilisateur
    const userId = agreement.project.client.userId
    const clientName = agreement.project.client.name
    const projectName = agreement.project.name

    await prisma.notification.create({
      data: {
        userId,
        type: 'payment_agreement_confirmed',
        title: 'Entente de paiement confirmée',
        message: `${clientName} a confirmé l'entente de paiement pour le projet "${projectName}"`,
        link: `/projets/${agreement.projectId}`,
      },
    })

    // Envoyer une notification email à l'utilisateur
    try {
      const userEmail = agreement.project.client.user.email
      const userName = agreement.project.client.user.name

      if (userEmail) {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: userEmail,
          subject: `Entente de paiement confirmée - ${projectName}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">✅ Entente confirmée</h1>
                  </div>
                  <div class="content">
                    <p>Bonjour ${userName || 'cher utilisateur'},</p>

                    <p><strong>${clientName}</strong> vient de confirmer l'entente de paiement pour le projet <strong>${projectName}</strong>.</p>

                    <div class="details">
                      <h3 style="margin-top: 0;">Détails de l'entente</h3>
                      <ul style="list-style: none; padding: 0;">
                        <li>📋 <strong>Projet:</strong> ${projectName}</li>
                        <li>👤 <strong>Client:</strong> ${clientName}</li>
                        <li>💰 <strong>Nombre de versements:</strong> ${agreement.numberOfInstallments}</li>
                        <li>💵 <strong>Montant par versement:</strong> ${agreement.amountPerInstallment.toFixed(2)} $</li>
                        <li>📅 <strong>Fréquence:</strong> Tous les ${agreement.frequency} jours</li>
                        <li>✅ <strong>Confirmé le:</strong> ${confirmationDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
                      </ul>
                    </div>

                    <p><strong>Prochaines étapes:</strong></p>
                    <ul>
                      <li>Les dates de paiement des factures ont été calculées automatiquement</li>
                      <li>Vous pouvez consulter les factures dans le projet</li>
                      <li>Le client recevra des rappels avant chaque échéance</li>
                    </ul>

                    <div style="text-align: center;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://solopack.app'}" class="button">
                        Voir le projet
                      </a>
                    </div>

                    <div class="footer">
                      <p>Ceci est une notification automatique de SoloPack</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        console.log('[confirm] Notification email sent to:', userEmail)
      }
    } catch (emailError) {
      console.error('[confirm] Failed to send notification email:', emailError)
      // Continue même si l'email échoue
    }

    return NextResponse.json({
      message: 'Entente confirmée avec succès',
      confirmedAt: confirmationDate,
      agreement,
    })
  } catch (error) {
    console.error('Error confirming agreement:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
