import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ZodError } from 'zod'
import { validateBody, validationError, createInvoiceSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

function makeInvoiceNumber() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `INV-${ymd}-${rand}`
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    // Validate request body with Zod
    const { clientId, unpaidAmountIds, items, projectId, dueDate } = await validateBody(req, createInvoiceSchema)

    const result = await prisma.$transaction(async (tx) => {
      // Vérifier client et ownership
      const client = await tx.client.findUnique({
        where: {
          id: clientId,
          userId: session.user.id
        }
      })
      if (!client) {
        throw new Error('CLIENT_NOT_FOUND')
      }

      // Récupérer les préférences de taxes de l'utilisateur
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { chargesTaxes: true }
      })
      const chargesTaxes = user?.chargesTaxes ?? false

      let invoiceItems: Array<{ description: string; amount: number; date?: Date; dueDate?: Date | null }>
      let unpaidIds: string[] = []

      // Mode 1: Création à partir d'items directs (nouveau)
      if (items) {
        logger.debug('[invoices:POST] Creating invoice with direct items:', items.length)
        invoiceItems = items.map(it => ({
          description: it.description,
          amount: it.amount,
          date: new Date(),
        }))
      }
      // Mode 2: Création à partir d'unpaidAmounts (ancien)
      else if (unpaidAmountIds) {
        // Récupérer montants encore "unpaid" pour ce client et ces IDs
        const unpaidItems = await tx.unpaidAmount.findMany({
          where: {
            id: { in: unpaidAmountIds },
            clientId,
            status: 'unpaid',
          },
          select: { id: true, amount: true, description: true, date: true, dueDate: true },
        })

        if (unpaidItems.length === 0) {
          logger.debug('[invoices:POST] No valid unpaid items found')
          throw new Error('NO_ITEMS')
        }

        invoiceItems = unpaidItems
        unpaidIds = unpaidItems.map(i => i.id)
        logger.debug('[invoices:POST] Creating invoice from unpaid amounts:', unpaidItems.length)
      } else {
        throw new Error('NO_ITEMS')
      }

      // Calcul des taxes québécoises (si l'utilisateur les charge)
      const subtotal = invoiceItems.reduce((s, it) => s + it.amount, 0)
      const tps = chargesTaxes ? subtotal * 0.05 : 0 // TPS 5%
      const tvq = chargesTaxes ? subtotal * 0.09975 : 0 // TVQ 9.975%
      const total = subtotal + tps + tvq
      const number = makeInvoiceNumber()

      const invoice = await tx.invoice.create({
        data: {
          clientId,
          number,
          status: 'draft',
          subtotal,
          tps,
          tvq,
          total,
          ...(projectId && { projectId }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
        },
      })
      logger.debug('[invoices:POST] Invoice created:', invoice.id, invoice.number)

      // Snapshot des lignes de facture
      if (invoiceItems.length > 0) {
        await tx.invoiceItem.createMany({
          data: invoiceItems.map((it) => ({
            invoiceId: invoice.id,
            description: it.description,
            amount: it.amount,
            date: it.date || new Date(),
            dueDate: it.dueDate ?? null,
          })),
        })
      }

      // Lier les UnpaidAmount à la facture seulement si on vient du mode unpaidAmountIds
      if (unpaidIds.length > 0) {
        try {
          await tx.unpaidAmount.updateMany({
            where: { id: { in: unpaidIds } },
            data: { status: 'invoiced', invoiceId: invoice.id },
          })
        } catch (e) {
          logger.warn('[invoices:POST] unpaidAmount.invoiceId link skipped (likely missing column):', e)
          await tx.unpaidAmount.updateMany({
            where: { id: { in: unpaidIds } },
            data: { status: 'invoiced' },
          })
        }
      }

      return invoice
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return validationError(err)
    }
    if (err instanceof Error) {
      if (err.message === 'CLIENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 })
      }
      if (err.message === 'NO_ITEMS') {
        return NextResponse.json({ error: 'Aucun montant sélectionné valide.' }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Erreur lors de la création de la facture.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        client: {
          userId: session.user.id,
        },
      },
      include: {
        items: true,
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(invoices)
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures.' },
      { status: 500 },
    )
  }
}
