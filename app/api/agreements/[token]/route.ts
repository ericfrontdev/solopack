import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const agreement = await prisma.paymentAgreement.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            budget: true,
          },
        },
      },
    })

    if (!agreement) {
      return NextResponse.json(
        { error: 'Entente introuvable' },
        { status: 404 }
      )
    }

    if (agreement.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Cette entente a déjà été confirmée' },
        { status: 400 }
      )
    }

    return NextResponse.json(agreement)
  } catch (error) {
    console.error('Error fetching agreement:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
