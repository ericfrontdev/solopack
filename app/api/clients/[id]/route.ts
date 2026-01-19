import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ZodError } from 'zod'
import { validateBody, validateParams, validationError, updateClientSchema, clientIdSchema } from '@/lib/validations'

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const params = await props.params
    const { id } = validateParams(params, clientIdSchema)

    // Validate request body
    const data = await validateBody(req, updateClientSchema)

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

    const client = await prisma.client.update({
      where: { id },
      data,
    })

    return NextResponse.json(client, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error)
    }
    console.error('[clients:PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la modification du client' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const params = await props.params
    const { id } = validateParams(params, clientIdSchema)

    const { searchParams } = new URL(req.url)
    const permanent = searchParams.get('permanent') === 'true'

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

    if (permanent) {
      // Permanent deletion - only for archived clients
      await prisma.client.delete({
        where: { id },
      })
      return NextResponse.json({ success: true, message: 'Client supprimé définitivement' }, { status: 200 })
    } else {
      // Archive the client instead of deleting
      await prisma.client.update({
        where: { id },
        data: {
          archived: true,
          archivedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, message: 'Client archivé' }, { status: 200 })
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error)
    }
    console.error('[clients:DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du client' },
      { status: 500 }
    )
  }
}
