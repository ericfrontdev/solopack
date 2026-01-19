import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const params = await props.params
  const id = params.id
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  try {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          client: {
            select: { id: true, name: true, company: true, email: true, address: true, userId: true },
          },
          items: {
            select: { id: true, description: true, amount: true, date: true, dueDate: true },
            orderBy: { date: 'asc' },
          },
        },
      })
      if (!invoice) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

      // Verify ownership
      if (invoice.client.userId !== session.user.id) {
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
      }

      // Get user info for PDF template
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          company: true,
          address: true,
          phone: true,
          email: true,
          neq: true,
          tpsNumber: true,
          tvqNumber: true,
          logo: true,
          paymentProvider: true,
        },
      })

      // If no items stored yet, try deriving from linked unpaid amounts
      if (!invoice.items || invoice.items.length === 0) {
        try {
          const amounts = await prisma.unpaidAmount.findMany({
            where: { invoiceId: id },
            select: { id: true, description: true, amount: true, date: true, dueDate: true },
            orderBy: { date: 'asc' },
          })
          if (amounts.length > 0) {
            return NextResponse.json({ ...invoice, items: amounts, user })
          }
        } catch {
          // if column doesn't exist, ignore
        }
      }

      return NextResponse.json({ ...invoice, user })
    } catch {
      // Fallback: older schema without items relation
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          client: {
            select: { id: true, name: true, company: true, email: true, address: true, userId: true },
          },
        },
      })
      if (!invoice) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

      // Verify ownership in fallback
      if (invoice.client.userId !== session.user.id) {
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
      }

      // Get user info for PDF template
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          company: true,
          address: true,
          phone: true,
          email: true,
          neq: true,
          tpsNumber: true,
          tvqNumber: true,
          logo: true,
          paymentProvider: true,
        },
      })

      return NextResponse.json({ ...invoice, user })
    }
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const params = await props.params
  const id = params.id
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  try {
    const body = await req.json()
    const { status, items, createdAt, dueDate } = body

    // First, get the invoice to verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { userId: true } },
        items: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    // Verify ownership
    if (invoice.client.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
    }

    // Récupérer les préférences de taxes de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { chargesTaxes: true }
    })
    const chargesTaxes = user?.chargesTaxes ?? false

    // Recalculate taxes if items are provided
    const updateData: {
      status?: string;
      subtotal?: number;
      tps?: number;
      tvq?: number;
      total?: number;
      createdAt?: Date;
      dueDate?: Date | null;
    } = {}
    if (status) updateData.status = status
    if (createdAt) updateData.createdAt = new Date(createdAt)
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

    if (items && Array.isArray(items)) {
      const subtotal = items.reduce((s: number, item: { amount: number }) => s + item.amount, 0)
      const tps = chargesTaxes ? subtotal * 0.05 : 0 // TPS 5%
      const tvq = chargesTaxes ? subtotal * 0.09975 : 0 // TVQ 9.975%
      const total = subtotal + tps + tvq

      updateData.subtotal = subtotal
      updateData.tps = tps
      updateData.tvq = tvq
      updateData.total = total
    }

    // Update invoice and items
    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        items: true,
      },
    })

    // Handle items if provided
    if (items && Array.isArray(items)) {
      // Delete old items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      })

      // Create new items
      await prisma.invoiceItem.createMany({
        data: items.map((item: { description: string; amount: number; date: string | Date; dueDate?: string | Date | null }) => ({
          invoiceId: id,
          description: item.description,
          amount: item.amount,
          date: new Date(item.date),
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
        })),
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error('Update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const params = await props.params
  const id = params.id
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  try {
    // First, get the invoice to verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { userId: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    // Verify ownership
    if (invoice.client.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
    }

    // Delete the invoice (cascade will handle items)
    await prisma.invoice.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
