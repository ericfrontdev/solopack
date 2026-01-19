import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ZodError } from 'zod'
import { validateBody, validationError, createClientSchema } from '@/lib/validations'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const clients = await prisma.client.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(clients)
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clients.' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Validate request body with Zod
    const data = await validateBody(req, createClientSchema)

    const client = await prisma.client.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error)
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création du client.' },
      { status: 500 },
    )
  }
}
