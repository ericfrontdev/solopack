import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PaymentSuccessPageClient } from '@/components/pages/payment-success-page-client'
import Stripe from 'stripe'
import { decrypt } from '@/lib/crypto'

async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      paidAt: true,
      client: {
        select: {
          name: true,
          email: true,
          user: {
            select: {
              name: true,
              company: true,
              stripeSecretKey: true,
            },
          },
        },
      },
    },
  })

  if (!invoice) {
    notFound()
  }

  return invoice
}

async function verifyAndUpdatePayment(invoiceId: string, sessionId: string, stripeSecretKey: string) {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
    })

    // Récupérer la session Stripe pour vérifier le paiement
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Si le paiement est complété et la facture n'est pas encore payée
    if (session.payment_status === 'paid') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentProvider: 'stripe',
          paymentTransactionId: session.payment_intent as string,
        },
      })

      // Marquer les unpaidAmounts comme payés
      await prisma.unpaidAmount.updateMany({
        where: { invoiceId },
        data: { status: 'paid' },
      })

      return true
    }

    return false
  } catch (error) {
    console.error('[payment-success] Error verifying payment:', error)
    return false
  }
}

export default async function PaymentSuccessPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const invoice = await getInvoice(params.id)

  // Si on a un session_id et que la facture n'est pas encore payée, vérifier le paiement
  if (searchParams.session_id && invoice.status !== 'paid' && invoice.client.user.stripeSecretKey) {
    try {
      // Decrypt the Stripe key before using it
      const decryptedKey = decrypt(invoice.client.user.stripeSecretKey)
      await verifyAndUpdatePayment(params.id, searchParams.session_id, decryptedKey)
      // Rediriger pour rafraîchir les données
      redirect(`/invoices/${params.id}/pay/success`)
    } catch (error) {
      console.error('[payment-success] Error decrypting Stripe key:', error)
      // Continue without verification if decryption fails
    }
  }

  return <PaymentSuccessPageClient invoice={invoice} />
}
