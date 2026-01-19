import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { Resend } from 'resend'
import { logger } from '@/lib/logger'

const INVOICE_FROM_EMAIL = process.env.INVOICE_FROM_EMAIL || process.env.EMAIL_FROM || 'invoices@solopack.app'

// Configuration pour désactiver le body parsing automatique
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface HelcimWebhookPayload {
  type: string
  transactionId?: string
  amount?: number
  currency?: string
  status?: string
  invoiceNumber?: string
  customField1?: string // On utilisera ce champ pour stocker l'invoiceId
  customer?: {
    name?: string
    email?: string
  }
  dateCreated?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Vérifier la signature Helcim si le secret est configuré
    const signature = req.headers.get('helcim-signature')
    const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        logger.error('[helcim-webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else {
      logger.warn('[helcim-webhook] No webhook secret configured - accepting unverified webhook')
    }

    const payload: HelcimWebhookPayload = JSON.parse(body)
    logger.debug('[helcim-webhook] Event received:', payload.type)

    // Gérer l'événement de paiement réussi
    if (payload.type === 'payment.success' || payload.type === 'transaction.success') {
      // Récupérer l'invoiceId depuis customField1
      const invoiceId = payload.customField1

      if (!invoiceId) {
        logger.error('[helcim-webhook] No invoice ID in payload')
        return NextResponse.json(
          { error: 'No invoice ID in payload' },
          { status: 400 }
        )
      }

      logger.debug('[helcim-webhook] Processing payment for invoice:', invoiceId)

      // Récupérer la facture avec les informations complètes
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          client: {
            include: {
              user: {
                select: {
                  name: true,
                  company: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      if (!invoice) {
        logger.error('[helcim-webhook] Invoice not found:', invoiceId)
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        )
      }

      // Vérifier que la facture n'est pas déjà payée
      if (invoice.status === 'paid') {
        logger.debug('[helcim-webhook] Invoice already paid:', invoiceId)
        return NextResponse.json({ received: true, message: 'Already paid' })
      }

      // Mettre à jour la facture
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentProvider: 'helcim',
          paymentTransactionId: payload.transactionId || '',
        },
      })

      // Marquer les unpaidAmounts comme payés
      await prisma.unpaidAmount.updateMany({
        where: { invoiceId },
        data: { status: 'paid' },
      })

      logger.debug('[helcim-webhook] Invoice updated successfully:', invoiceId)

      // Envoyer un email de confirmation au client
      try {
        if (!process.env.RESEND_API_KEY || !INVOICE_FROM_EMAIL) {
          logger.error('[helcim-webhook] Email configuration missing')
        } else if (!invoice.client.email) {
          logger.error('[helcim-webhook] Client email not found')
        } else {
          const resend = new Resend(process.env.RESEND_API_KEY)

          const providerName = invoice.client.user.company || invoice.client.user.name
          const paidAtFormatted = new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short',
          }).format(new Date())

          await resend.emails.send({
            from: INVOICE_FROM_EMAIL,
            to: invoice.client.email,
            subject: `Confirmation de paiement - Facture ${invoice.number}`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #10b981; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px 20px; }
                    .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .detail-row:last-child { border-bottom: none; }
                    .label { color: #6b7280; }
                    .value { font-weight: 600; }
                    .amount { font-size: 24px; color: #10b981; font-weight: bold; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                    .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">✓ Paiement reçu</h1>
                      <p style="margin: 10px 0 0 0;">Merci pour votre paiement!</p>
                    </div>

                    <div class="content">
                      <p>Bonjour ${invoice.client.name || 'Client'},</p>

                      <p>Nous avons bien reçu votre paiement pour la facture <strong>${invoice.number}</strong>.</p>

                      <div class="details">
                        <div class="detail-row">
                          <span class="label">Facture</span>
                          <span class="value">${invoice.number}</span>
                        </div>
                        <div class="detail-row">
                          <span class="label">Date de paiement</span>
                          <span class="value">${paidAtFormatted}</span>
                        </div>
                        <div class="detail-row">
                          <span class="label">Méthode de paiement</span>
                          <span class="value">Helcim</span>
                        </div>
                        <div class="detail-row">
                          <span class="label">Montant payé</span>
                          <span class="amount">${invoice.total.toFixed(2)} $</span>
                        </div>
                      </div>

                      <p>Votre paiement a été traité avec succès. Vous pouvez consulter votre facture en cliquant sur le bouton ci-dessous:</p>

                      <div style="text-align: center;">
                        <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice.id}/pay" class="button">Voir ma facture</a>
                      </div>

                      <p style="margin-top: 30px;">Si vous avez des questions, n'hésitez pas à contacter ${providerName}.</p>

                      <p>Merci d'avoir fait affaire avec ${providerName}!</p>
                    </div>

                    <div class="footer">
                      <p>Cet email a été envoyé automatiquement par SoloPack.</p>
                      <p style="margin: 5px 0;">Powered by <strong>SoloPack</strong></p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          })

          logger.debug('[helcim-webhook] Confirmation email sent to:', invoice.client.email)
        }
      } catch (emailError) {
        logger.error('[helcim-webhook] Error sending email:', emailError)
        // Ne pas faire échouer le webhook si l'email échoue
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('[helcim-webhook] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
