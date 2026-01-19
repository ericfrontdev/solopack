import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        betaTester: true,
        lifetimeDiscount: true,
        plan: true,
        subscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Vérifier si déjà abonné
    if (user.plan === 'pro' && user.subscriptionStatus === 'active') {
      return NextResponse.json(
        { error: 'Vous êtes déjà abonné' },
        { status: 400 }
      )
    }

    // Déterminer le plan selon le statut beta tester
    const isBetaTester = user.betaTester && user.lifetimeDiscount > 0
    const planId = isBetaTester
      ? process.env.HELCIM_PLAN_ID_BETA
      : process.env.HELCIM_PLAN_ID_PRO

    if (!planId) {
      logger.error('ID de plan Helcim manquant')
      return NextResponse.json(
        { error: 'Configuration de paiement manquante' },
        { status: 500 }
      )
    }

    const helcimApiToken = process.env.HELCIM_API_TOKEN

    if (!helcimApiToken) {
      logger.error('HELCIM_API_TOKEN manquant')
      return NextResponse.json(
        { error: 'Configuration de paiement manquante' },
        { status: 500 }
      )
    }

    // Créer ou récupérer le customer Helcim
    try {
      // D'abord, essayer de créer le customer avec notre customerCode
      const createCustomerResponse = await fetch('https://api.helcim.com/v2/customers/', {
        method: 'POST',
        headers: {
          'api-token': helcimApiToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactName: user.name,
          email: user.email,
          customerCode: user.id, // Utiliser notre user.id comme customerCode
        }),
      })

      const customerData = await createCustomerResponse.json()

      let helcimCustomerCode = user.id

      if (createCustomerResponse.ok) {
        // Customer créé avec succès
        logger.debug('[create-checkout] Customer Helcim créé:', customerData)

        // Stocker le customerCode dans notre BD
        await prisma.user.update({
          where: { id: user.id },
          data: {
            helcimCustomerCode: customerData.customerCode || user.id,
            helcimCustomerId: customerData.customerId?.toString(),
          },
        })

        helcimCustomerCode = customerData.customerCode || user.id
      } else {
        // Le customer existe peut-être déjà, continuer quand même
        logger.debug('[create-checkout] Erreur création customer (peut-être existe déjà):', customerData)
      }

      // Construire l'URL d'abonnement Helcim
      const subscriptionUrl = new URL(`https://subscriptions.helcim.com/subscribe/${planId}`)

      // Ajouter les informations du client
      subscriptionUrl.searchParams.set('customerCode', helcimCustomerCode)
      subscriptionUrl.searchParams.set('email', user.email)
      if (user.name) {
        subscriptionUrl.searchParams.set('name', user.name)
      }

      // URL de redirection après paiement réussi
      const successUrl = `${process.env.NEXTAUTH_URL}/pricing/success`
      subscriptionUrl.searchParams.set('returnUrl', successUrl)
      subscriptionUrl.searchParams.set('successUrl', successUrl)

      return NextResponse.json({
        url: subscriptionUrl.toString(),
        planId,
      })
    } catch (error) {
      logger.error('[create-checkout] Erreur lors de la création du customer:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la préparation du paiement' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Erreur lors de la création de la session Helcim:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
