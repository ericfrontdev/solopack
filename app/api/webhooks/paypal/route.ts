import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    // Récupérer les données du webhook PayPal
    const body = await req.text()
    const params = new URLSearchParams(body)

    const paymentStatus = params.get('payment_status')
    const invoiceId = params.get('custom')
    const txnId = params.get('txn_id')
    const receiverEmail = params.get('receiver_email')
    const mcGross = params.get('mc_gross')

    logger.debug('[paypal-webhook] Payment notification received:', {
      paymentStatus,
      invoiceId,
      txnId,
      receiverEmail,
      mcGross,
    })

    // Vérifier que c'est bien un paiement complété
    if (paymentStatus !== 'Completed') {
      logger.debug('[paypal-webhook] Payment not completed, status:', paymentStatus)
      return NextResponse.json({ message: 'Payment not completed' })
    }

    if (!invoiceId) {
      logger.error('[paypal-webhook] No invoice ID in custom field')
      return NextResponse.json({ error: 'No invoice ID' }, { status: 400 })
    }

    // Récupérer la facture
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          select: {
            user: {
              select: {
                paypalEmail: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      logger.error('[paypal-webhook] Invoice not found:', invoiceId)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Vérifier que le paiement a été envoyé au bon compte PayPal
    if (receiverEmail !== invoice.client.user.paypalEmail) {
      logger.error('[paypal-webhook] Receiver email mismatch:', {
        received: receiverEmail,
        expected: invoice.client.user.paypalEmail,
      })
      return NextResponse.json({ error: 'Receiver email mismatch' }, { status: 400 })
    }

    // Vérifier que le montant est correct
    const expectedAmount = invoice.total.toFixed(2)
    if (mcGross !== expectedAmount) {
      logger.error('[paypal-webhook] Amount mismatch:', {
        received: mcGross,
        expected: expectedAmount,
      })
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // Mettre à jour la facture
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentProvider: 'paypal',
        paymentTransactionId: txnId,
      },
    })

    // Marquer les unpaidAmounts comme payés
    await prisma.unpaidAmount.updateMany({
      where: { invoiceId },
      data: { status: 'paid' },
    })

    logger.debug('[paypal-webhook] Invoice updated successfully:', invoiceId)

    return NextResponse.json({ message: 'Payment processed successfully' })
  } catch (error) {
    logger.error('[paypal-webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
