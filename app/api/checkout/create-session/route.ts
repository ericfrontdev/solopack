import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        betaTester: true,
        lifetimeDiscount: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Créer ou récupérer le customer Stripe
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      // Sauvegarder le customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Déterminer le prix selon si beta tester ou non
    const priceId = process.env.STRIPE_PRICE_ID_PRO!

    // Si beta tester avec discount, on va créer un coupon
    let discounts = undefined
    if (user.betaTester && user.lifetimeDiscount > 0) {
      // Créer un coupon pour la réduction à vie
      const coupon = await stripe.coupons.create({
        percent_off: user.lifetimeDiscount,
        duration: 'forever',
        name: `Beta Tester ${user.lifetimeDiscount}% à vie`,
      })
      discounts = [{ coupon: coupon.id }]
    }

    // Créer la session Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      discounts,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    )
  }
}
