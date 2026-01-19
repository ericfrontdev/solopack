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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        helcimCustomerId: true,
        helcimCustomerCode: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Vérifier qu'il y a un abonnement actif
    if (user.plan !== 'pro' || user.subscriptionStatus !== 'active') {
      return NextResponse.json(
        { error: 'Aucun abonnement actif à annuler' },
        { status: 400 }
      )
    }

    // Calculer la date de fin (sera mise à jour avec dateBilling si disponible)
    let subscriptionEndsAt = new Date()
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30) // Fallback: 30 jours

    // Annuler l'abonnement chez Helcim
    const helcimApiToken = process.env.HELCIM_API_TOKEN
    let helcimCanceled = false
    const debugLogs: string[] = []

    debugLogs.push(`[1] CustomerCode: ${user.helcimCustomerCode}`)
    debugLogs.push(`[2] API Token présent: ${!!helcimApiToken}`)

    if (helcimApiToken && user.helcimCustomerCode) {
      try {
        // 1. Récupérer les subscriptions du customer
        debugLogs.push(`[3] Appel GET subscriptions pour ${user.helcimCustomerCode}`)
        const subscriptionsRes = await fetch(
          `https://api.helcim.com/v2/subscriptions?customerCode=${user.helcimCustomerCode}`,
          {
            method: 'GET',
            headers: {
              'api-token': helcimApiToken,
              'Content-Type': 'application/json',
            },
          }
        )

        debugLogs.push(`[4] Réponse: ${subscriptionsRes.status} ${subscriptionsRes.statusText}`)

        if (subscriptionsRes.ok) {
          const response = await subscriptionsRes.json()
          debugLogs.push(`[5] Subscriptions reçues: ${JSON.stringify(response)}`)

          // 2. Trouver la première subscription active
          // L'API Helcim retourne { status: "ok", data: [...] }
          const subscriptions = response.data || response
          const activeSubscription = Array.isArray(subscriptions)
            ? subscriptions.find((sub: { status: string }) => sub.status === 'active')
            : null

          debugLogs.push(`[6] Active subscription: ${activeSubscription ? activeSubscription.id : 'null'}`)

          if (activeSubscription?.id) {
            // 3. Annuler via PATCH avec status="cancelled"
            // Cela met le statut à "cancelled" et arrête les futures facturations
            // L'utilisateur garde l'accès jusqu'à dateBilling (fin de période payée)
            debugLogs.push(`[7] dateBilling: ${activeSubscription.dateBilling || 'non défini'}`)
            debugLogs.push(`[7b] dateActivated brut: ${activeSubscription.dateActivated}`)

            // Note: Ne pas inclure dateActivated - Helcim refuse de modifier ce champ
            // pour une subscription déjà active (erreur: "cannot activate before the current date")
            const patchBody = {
              subscriptions: [
                {
                  id: activeSubscription.id,
                  status: 'cancelled',
                  recurringAmount: activeSubscription.recurringAmount
                }
              ]
            }
            debugLogs.push(`[8] Body PATCH: ${JSON.stringify(patchBody)}`)

            const cancelRes = await fetch(
              `https://api.helcim.com/v2/subscriptions`,
              {
                method: 'PATCH',
                headers: {
                  'api-token': helcimApiToken,
                  'accept': 'application/json',
                  'content-type': 'application/json',
                },
                body: JSON.stringify(patchBody),
              }
            )

            debugLogs.push(`[9] Réponse PATCH: ${cancelRes.status} ${cancelRes.statusText}`)

            if (cancelRes.ok) {
              helcimCanceled = true
              debugLogs.push(`[10] ✅ Subscription annulée dans Helcim avec succès`)

              // Utiliser dateBilling comme date de fin si disponible
              if (activeSubscription.dateBilling) {
                subscriptionEndsAt = new Date(activeSubscription.dateBilling)
                debugLogs.push(`[11] subscriptionEndsAt défini à dateBilling: ${subscriptionEndsAt.toISOString()}`)
              } else {
                debugLogs.push(`[11] dateBilling non disponible, utilisation du fallback (30 jours)`)
              }
            } else {
              const errorText = await cancelRes.text()
              debugLogs.push(`[10] ❌ Erreur: ${errorText}`)
            }
          } else {
            debugLogs.push('[6] ❌ Aucune subscription active trouvée')
          }
        } else {
          const errorText = await subscriptionsRes.text()
          debugLogs.push(`[5] ❌ Erreur API: ${errorText}`)
        }
      } catch (error) {
        debugLogs.push(`[ERROR] Exception: ${error instanceof Error ? error.message : String(error)}`)
        // On continue quand même pour annuler dans notre BD
      }
    } else {
      debugLogs.push('[3] ⚠️ Pas de token ou customerCode, skip Helcim')
    }

    // Logger dans la BD
    await prisma.webhookLog.create({
      data: {
        endpoint: '/api/subscription/cancel',
        method: 'POST',
        headers: JSON.stringify({}),
        body: JSON.stringify({ userId: user.id, customerCode: user.helcimCustomerCode }),
        signature: null,
        status: 200,
        error: null,
        debugInfo: debugLogs.join('\n'),
      },
    })

    // Mettre à jour dans notre BD
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionEndsAt,
        // Effacer le subscriptionId si annulé avec succès chez Helcim
        ...(helcimCanceled && { helcimSubscriptionId: null }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Abonnement annulé avec succès',
      endsAt: subscriptionEndsAt,
      helcimCanceled,
    })
  } catch (error) {
    logger.error('Erreur lors de l\'annulation de l\'abonnement:', error)

    // Logger l'erreur en BD
    try {
      const session = await auth()
      await prisma.webhookLog.create({
        data: {
          endpoint: '/api/subscription/cancel',
          method: 'POST',
          headers: JSON.stringify({}),
          body: JSON.stringify({ userId: session?.user?.id }),
          signature: null,
          status: 500,
          error: error instanceof Error ? error.message : 'Unknown error',
          debugInfo: error instanceof Error ? error.stack : null,
        },
      })
    } catch (logError) {
      logger.error('Erreur lors du logging:', logError)
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
