import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

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

    const body = await req.json()
    let { name, company, email, phone, address, website } = body ?? {}

    name = typeof name === 'string' ? name.trim() : ''
    email = typeof email === 'string' ? email.trim() : ''
    company = typeof company === 'string' ? company.trim() : null
    phone = typeof phone === 'string' ? phone.trim() : null
    address = typeof address === 'string' ? address.trim() : null
    website = typeof website === 'string' ? website.trim() : null

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Les champs name et email sont requis.' },
        { status: 400 },
      )
    }

    const emailOk = /.+@.+\..+/.test(email)
    if (!emailOk) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    const client = await prisma.client.create({
      data: {
        name,
        company: company || null,
        email,
        phone: phone || null,
        address: address || null,
        website: website || null,
        userId: session.user.id,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la création du client.' },
      { status: 500 },
    )
  }
}
