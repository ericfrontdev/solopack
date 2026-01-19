import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

interface HelcimWebhookData {
  type?: string
  eventType?: string
  id?: string // transactionId pour cardTransaction
  customer?: {
    customerCode?: string
    id?: string
  }
  customerCode?: string
  customerId?: string
}

interface HelcimTransactionResponse {
  cardTransactionId: number
  dateCreated: string
  status: string
  type: string
  amount: number
  currency: string
  customerCode?: string
  customerId?: number
  cardHolderName?: string
  email?: string
  // ... autres champs
}

export async function POST(request: Request) {
  const signature = request.headers.get('helcim-signature')
  const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET
  let body = ''
  let parsedBody: HelcimWebhookData
  let statusCode = 200
  let errorMessage: string | null = null

  try {
    // Collecter tous les headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Vérifier la signature Helcim pour la sécurité
    if (webhookSecret && signature) {
      body = await request.text()
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        logger.error('Signature webhook invalide')
        statusCode = 401
        errorMessage = 'Signature invalide'

        // Logger en BD avant de retourner
        await prisma.webhookLog.create({
          data: {
            endpoint: '/api/webhooks/billing',
            method: 'POST',
            headers: JSON.stringify(headers),
            body,
            signature,
            status: statusCode,
            error: errorMessage,
          },
        })

        return NextResponse.json({ error: errorMessage }, { status: statusCode })
      }

      parsedBody = JSON.parse(body)
      logger.debug('Webhook Helcim reçu (vérifié):', parsedBody)
    } else {
      // Si pas de secret configuré, traiter quand même (pour dev)
      parsedBody = await request.json()
      body = JSON.stringify(parsedBody)
      logger.debug('Webhook Helcim reçu (non vérifié):', parsedBody)
    }

    // Logger en BD AVANT le traitement
    await prisma.webhookLog.create({
      data: {
        endpoint: '/api/webhooks/billing',
        method: 'POST',
        headers: JSON.stringify(headers),
        body,
        signature,
        status: statusCode,
        error: null,
      },
    })

    // Traiter le webhook
    return await processWebhook(parsedBody)
  } catch (error) {
    logger.error('Erreur webhook Helcim:', error)
    statusCode = 500
    errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Logger l'erreur en BD
    try {
      await prisma.webhookLog.create({
        data: {
          endpoint: '/api/webhooks/billing',
          method: 'POST',
          headers: JSON.stringify({}),
          body: body || '',
          signature,
          status: statusCode,
          error: errorMessage,
        },
      })
    } catch (logError) {
      logger.error('Erreur lors du logging:', logError)
    }

    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook' },
      { status: statusCode }
    )
  }
}

async function processWebhook(body: HelcimWebhookData) {
  try {
    // Vérifier le type d'événement
    const eventType = body.type || body.eventType

    switch (eventType) {
      case 'cardTransaction':
        // Pour les transactions d'abonnement, on doit récupérer les détails complets
        await handleCardTransaction(body)
        break

      case 'payment.success':
      case 'recurring.success':
        await handlePaymentSuccess(body)
        break

      case 'payment.failed':
      case 'recurring.failed':
        await handlePaymentFailed(body)
        break

      case 'subscription.cancelled':
      case 'recurring.cancelled':
        await handleSubscriptionCancelled(body)
        break

      default:
        logger.debug('Type d\'événement non géré:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Erreur processWebhook:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}

async function handleCardTransaction(data: HelcimWebhookData) {
  const debugLogs: string[] = []
  debugLogs.push('[1] Webhook cardTransaction reçu')
  debugLogs.push(`[2] Payload: ${JSON.stringify(data)}`)

  const transactionId = data.id

  if (!transactionId) {
    debugLogs.push('[3] ERREUR: Pas de transactionId dans le webhook')
    await logDebugInfo(transactionId || 'unknown', debugLogs.join('\n'))
    return
  }

  debugLogs.push(`[3] TransactionId trouvé: ${transactionId}`)

  // Appeler l'API Helcim pour obtenir les détails complets
  try {
    const helcimApiToken = process.env.HELCIM_API_TOKEN

    if (!helcimApiToken) {
      debugLogs.push('[4] ERREUR: HELCIM_API_TOKEN non configuré dans les variables d\'environnement')
      await logDebugInfo(transactionId, debugLogs.join('\n'))
      return
    }

    debugLogs.push('[4] HELCIM_API_TOKEN trouvé')
    debugLogs.push(`[5] Appel API: GET https://api.helcim.com/v2/card-transactions/${transactionId}`)

    const response = await fetch(
      `https://api.helcim.com/v2/card-transactions/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'api-token': helcimApiToken,
          'Content-Type': 'application/json',
        },
      }
    )

    debugLogs.push(`[6] Réponse API: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      debugLogs.push(`[7] ERREUR API: ${errorText}`)
      await logDebugInfo(transactionId, debugLogs.join('\n'))
      return
    }

    const transaction: HelcimTransactionResponse = await response.json()
    debugLogs.push(`[7] Transaction récupérée: ${JSON.stringify(transaction)}`)

    const customerCode = transaction.customerCode

    if (!customerCode) {
      debugLogs.push('[8] ERREUR: Pas de customerCode dans la transaction')
      await logDebugInfo(transactionId, debugLogs.join('\n'))
      return
    }

    debugLogs.push(`[8] CustomerCode trouvé: ${customerCode}`)

    // Chercher l'utilisateur par helcimCustomerCode
    debugLogs.push('[9] Recherche de l\'utilisateur par helcimCustomerCode...')

    let user = await prisma.user.findUnique({
      where: { helcimCustomerCode: customerCode },
    })

    if (!user) {
      debugLogs.push('[10] Utilisateur non trouvé par helcimCustomerCode')

      // Fallback: chercher par nom (cardHolderName)
      if (transaction.cardHolderName) {
        debugLogs.push(`[11] Tentative de recherche par nom: ${transaction.cardHolderName}`)

        user = await prisma.user.findFirst({
          where: { name: transaction.cardHolderName },
        })

        if (user) {
          debugLogs.push(`[12] ✅ Utilisateur trouvé par nom: ${user.id}`)

          // Stocker le helcimCustomerCode pour la prochaine fois
          await prisma.user.update({
            where: { id: user.id },
            data: {
              helcimCustomerCode: customerCode,
            },
          })

          debugLogs.push('[13] helcimCustomerCode stocké pour les prochaines fois')
        } else {
          debugLogs.push('[12] ERREUR: Utilisateur non trouvé par nom non plus')
          await logDebugInfo(transactionId, debugLogs.join('\n'))
          return
        }
      } else {
        debugLogs.push('[11] ERREUR: Pas de cardHolderName dans la transaction')
        await logDebugInfo(transactionId, debugLogs.join('\n'))
        return
      }
    }

    debugLogs.push(`[14] Utilisateur finalement trouvé: ${user.id}`)

    // Mettre à jour l'utilisateur
    debugLogs.push('[15] Mise à jour de l\'utilisateur en base de données...')

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'pro',
        subscriptionStatus: 'active',
        helcimCustomerId: transaction.customerId?.toString(),
        helcimCustomerCode: customerCode,
        subscriptionEndsAt: null,
      },
    })

    debugLogs.push(`[16] ✅ Succès! Utilisateur ${user.id} mis à jour en plan Pro`)
    await logDebugInfo(transactionId, debugLogs.join('\n'))
  } catch (error) {
    debugLogs.push(`[ERROR] Exception: ${error instanceof Error ? error.message : String(error)}`)
    if (error instanceof Error && error.stack) {
      debugLogs.push(`Stack: ${error.stack}`)
    }
    await logDebugInfo(transactionId || 'unknown', debugLogs.join('\n'))
    throw error
  }
}

async function logDebugInfo(transactionId: string, debugInfo: string) {
  try {
    // Trouver le dernier webhook log pour cette transaction
    const lastLog = await prisma.webhookLog.findFirst({
      where: {
        body: {
          contains: transactionId,
        },
      },
      orderBy: {
        processedAt: 'desc',
      },
    })

    if (lastLog) {
      await prisma.webhookLog.update({
        where: { id: lastLog.id },
        data: { debugInfo },
      })
    }
  } catch (error) {
    logger.error('[logDebugInfo] Erreur:', error)
  }
}

async function handlePaymentSuccess(data: HelcimWebhookData) {
  logger.debug('[handlePaymentSuccess] Full payload:', JSON.stringify(data, null, 2))

  const customerCode = data.customer?.customerCode || data.customerCode

  if (!customerCode) {
    logger.error('[handlePaymentSuccess] ERREUR: Pas de customerCode dans le webhook')
    logger.error('[handlePaymentSuccess] data.customer:', data.customer)
    logger.error('[handlePaymentSuccess] data.customerCode:', data.customerCode)
    logger.error('[handlePaymentSuccess] Full data keys:', Object.keys(data))
    return
  }

  logger.debug(`[handlePaymentSuccess] customerCode trouvé: ${customerCode}`)

  // Mettre à jour l'utilisateur
  try {
    await prisma.user.update({
      where: { id: customerCode },
      data: {
        plan: 'pro',
        subscriptionStatus: 'active',
        helcimCustomerId: data.customer?.id || data.customerId,
        subscriptionEndsAt: null, // L'abonnement est actif
      },
    })

    logger.debug(`[handlePaymentSuccess] ✅ Abonnement activé pour l'utilisateur ${customerCode}`)
  } catch (error) {
    logger.error(`[handlePaymentSuccess] ❌ Erreur lors de la mise à jour de l'utilisateur:`, error)
    throw error
  }
}

async function handlePaymentFailed(data: HelcimWebhookData) {
  const customerCode = data.customer?.customerCode || data.customerCode

  if (!customerCode) {
    logger.error('Pas de customerCode dans le webhook')
    return
  }

  // Mettre à jour le statut à "past_due"
  await prisma.user.update({
    where: { id: customerCode },
    data: {
      subscriptionStatus: 'past_due',
    },
  })

  logger.debug(`Paiement échoué pour l'utilisateur ${customerCode}`)

  // TODO: Envoyer un email à l'utilisateur pour l'informer
}

async function handleSubscriptionCancelled(data: HelcimWebhookData) {
  const customerCode = data.customer?.customerCode || data.customerCode

  if (!customerCode) {
    logger.error('Pas de customerCode dans le webhook')
    return
  }

  // Calculer la date de fin de l'abonnement (30 jours à partir d'aujourd'hui)
  const subscriptionEndsAt = new Date()
  subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30)

  // Mettre à jour l'utilisateur
  await prisma.user.update({
    where: { id: customerCode },
    data: {
      subscriptionStatus: 'canceled',
      subscriptionEndsAt,
    },
  })

  logger.debug(`Abonnement annulé pour l'utilisateur ${customerCode}`)

  // TODO: Envoyer un email de confirmation d'annulation
}
