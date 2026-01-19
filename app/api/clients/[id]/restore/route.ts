import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const params = await props.params
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    // Verify ownership
    const existingClient = await prisma.client.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingClient || existingClient.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Client introuvable' },
        { status: 404 }
      )
    }

    // Restore the client
    await prisma.client.update({
      where: { id },
      data: {
        archived: false,
        archivedAt: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Client restauré' }, { status: 200 })
  } catch (e) {
    logger.error('[clients:restore] Error:', e)
    return NextResponse.json(
      { error: 'Erreur lors de la restauration du client' },
      { status: 500 }
    )
  }
}
