import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 })
    }

    // Récupérer la facture
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          select: {
            name: true,
            email: true,
            user: {
              select: {
                stripeSecretKey: true,
                paymentProvider: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Facture déjà payée' }, { status: 400 })
    }

    if (invoice.client.user.paymentProvider !== 'stripe') {
      return NextResponse.json(
        { error: 'Stripe non configuré pour ce compte' },
        { status: 400 }
      )
    }

    if (!invoice.client.user.stripeSecretKey) {
      return NextResponse.json(
        { error: 'Clé Stripe manquante. Veuillez configurer votre clé Stripe dans vos paramètres.' },
        { status: 400 }
      )
    }

    // Initialiser Stripe avec la clé de l'utilisateur
    const stripe = new Stripe(invoice.client.user.stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
    })

    console.log('[create-stripe-session] Creating session:', {
      invoiceNumber: invoice.number,
      totalAmount: Math.round(invoice.total * 100),
    })

    // Créer une session de paiement Stripe standard
    // Les fonds vont directement sur le compte Stripe de l'utilisateur
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Facture ${invoice.number}`,
              description: `Paiement de la facture ${invoice.number}`,
            },
            unit_amount: Math.round(invoice.total * 100), // Convertir en cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/invoices/${invoice.id}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/invoices/${invoice.id}/pay`,
      customer_email: invoice.client.email || undefined,
      metadata: {
        invoiceId: invoice.id,
      },
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('[create-stripe-session] Session created:', session.id)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[create-stripe-session] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement', details: errorMessage },
      { status: 500 }
    )
  }
}
