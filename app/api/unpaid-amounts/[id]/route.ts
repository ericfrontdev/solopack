import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const params = await props.params
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const body = await req.json()
    const { amount, description, date, dueDate } = body

    if (!amount || !description || !date) {
      return NextResponse.json(
        { error: 'Montant, description et date requis' },
        { status: 400 }
      )
    }

    // Verify ownership through client
    const existingAmount = await prisma.unpaidAmount.findUnique({
      where: { id },
      include: { client: true }
    })

    if (!existingAmount) {
      return NextResponse.json({ error: 'Montant introuvable.' }, { status: 404 })
    }

    if (existingAmount.client.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
    }

    const unpaidAmount = await prisma.unpaidAmount.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    })

    return NextResponse.json(unpaidAmount, { status: 200 })
  } catch (e) {
    logger.error('[unpaid-amounts:PATCH] Error:', e)
    return NextResponse.json(
      { error: 'Erreur lors de la modification du montant' },
      { status: 500 }
    )
  }
}
