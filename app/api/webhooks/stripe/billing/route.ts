import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_BILLING!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Gérer les différents types d'événements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const subscriptionId = session.subscription as string

        if (userId && subscriptionId) {
          // Récupérer les détails de l'abonnement
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const currentPeriodEnd = typeof subscription === 'object' && 'current_period_end' in subscription
            ? (subscription.current_period_end as number)
            : 0

          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: 'pro',
              stripeSubscriptionId: subscriptionId,
              subscriptionStatus: subscription.status,
              subscriptionEndsAt: new Date(currentPeriodEnd * 1000),
            },
          })

          console.log(`✅ Abonnement créé pour l'utilisateur ${userId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end: number }
        const userId = subscription.metadata?.userId

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: subscription.status,
              subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
              plan: subscription.status === 'active' ? 'pro' : 'free',
            },
          })

          console.log(`✅ Abonnement mis à jour pour l'utilisateur ${userId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription & { ended_at?: number }
        const userId = subscription.metadata?.userId

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: 'free',
              subscriptionStatus: 'canceled',
              subscriptionEndsAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : new Date(),
            },
          })

          console.log(`❌ Abonnement annulé pour l'utilisateur ${userId}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
        const subscriptionId = invoice.subscription

        if (subscriptionId && typeof subscriptionId === 'string') {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata?.userId
          const currentPeriodEnd = typeof subscription === 'object' && 'current_period_end' in subscription
            ? (subscription.current_period_end as number)
            : 0

          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionStatus: 'active',
                plan: 'pro',
                subscriptionEndsAt: new Date(currentPeriodEnd * 1000),
              },
            })

            console.log(`✅ Paiement réussi pour l'utilisateur ${userId}`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
        const subscriptionId = invoice.subscription

        if (subscriptionId && typeof subscriptionId === 'string') {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata?.userId

          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionStatus: 'past_due',
              },
            })

            console.log(`⚠️ Paiement échoué pour l'utilisateur ${userId}`)

            // TODO: Envoyer un email à l'utilisateur pour l'informer
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
