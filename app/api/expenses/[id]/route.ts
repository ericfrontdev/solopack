import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { description, amount, date, category } = body

    // Vérifier que la dépense appartient à l'utilisateur
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existingExpense || existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 })
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        category: category || null,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    logger.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la dépense' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que la dépense appartient à l'utilisateur
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existingExpense || existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Dépense supprimée' })
  } catch (error) {
    logger.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la dépense' },
      { status: 500 }
    )
  }
}
