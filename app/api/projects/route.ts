import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { resend } from '@/lib/resend'
import PaymentAgreementEmail from '@/emails/payment-agreement-email'
import { ZodError } from 'zod'
import { validateSearchParams, validationError, projectsQuerySchema } from '@/lib/validations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const PAYMENT_AGREEMENT_FROM_EMAIL = process.env.PAYMENT_AGREEMENT_FROM_EMAIL || process.env.EMAIL_FROM || 'agreements@solopack.app'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { clientId } = validateSearchParams(request, projectsQuerySchema)

    // Cas 1: Si clientId est fourni, retourner les projets de ce client
    if (clientId) {
    // Vérifier que le client appartient à l'utilisateur
    const client = await prisma.client.findUnique({
      where: { id: clientId, userId: session.user.id },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const projects = await prisma.project.findMany({
      where: { clientId },
      include: {
        invoices: {
          select: {
            id: true,
            number: true,
            total: true,
            status: true,
          },
        },
        files: {
          select: {
            id: true,
            filename: true,
            fileSize: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projects)
  }

  // Cas 2: Si pas de clientId, retourner TOUS les projets de l'utilisateur
  const projects = await prisma.project.findMany({
    where: {
      client: {
        userId: session.user.id,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      invoices: {
        select: {
          id: true,
          number: true,
          total: true,
          status: true,
        },
      },
      files: {
        select: {
          id: true,
          filename: true,
          fileSize: true,
          uploadedAt: true,
        },
      },
      paymentAgreement: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(projects)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error)
    }
    return NextResponse.json({ error: 'Erreur lors de la récupération des projets' }, { status: 500 })
  }
}

async function generateUniqueInvoiceNumber(): Promise<string> {
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { number: true },
  })

  let nextNumber = 1
  if (lastInvoice) {
    const match = lastInvoice.number.match(/\d+/)
    if (match) {
      nextNumber = parseInt(match[0]) + 1
    }
  }

  return `INV-${nextNumber.toString().padStart(5, '0')}`
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { clientId, name, description, status, budget, startDate, endDate, invoiceIds, paymentPlan } = body

  console.log('POST /api/projects - Body:', { clientId, name, budget, paymentPlan })

  if (!clientId || !name) {
    return NextResponse.json(
      { error: 'clientId et name requis' },
      { status: 400 }
    )
  }

  // Vérifier que le client appartient à l'utilisateur
  const client = await prisma.client.findUnique({
    where: { id: clientId, userId: session.user.id },
  })

  if (!client) {
    return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
  }

  // Créer le projet
  const project = await prisma.project.create({
    data: {
      name,
      description,
      status: status || 'active',
      budget: budget ? parseFloat(budget) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      clientId,
    },
    include: {
      invoices: true,
      files: true,
      client: true,
    },
  })

  // Lier les factures au projet si spécifiées
  if (invoiceIds && Array.isArray(invoiceIds) && invoiceIds.length > 0) {
    await prisma.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        clientId,
      },
      data: {
        projectId: project.id,
      },
    })
  }

  // Si un plan de paiement est spécifié, créer l'entente et les factures
  if (paymentPlan && paymentPlan.numberOfInstallments && budget) {
    console.log('Creating payment plan with:', { paymentPlan, budget })
    const { numberOfInstallments, frequency } = paymentPlan
    const totalBudget = parseFloat(budget)
    const amountPerInstallment = totalBudget / numberOfInstallments

    console.log('Calculated:', { totalBudget, amountPerInstallment, numberOfInstallments })

    // Générer un token sécurisé
    const token = crypto.randomBytes(32).toString('hex')

    // Créer l'entente de paiement
    await prisma.paymentAgreement.create({
      data: {
        projectId: project.id,
        numberOfInstallments,
        frequency,
        amountPerInstallment,
        token,
        status: 'pending',
      },
    })

    // Créer les factures de versements en draft
    const invoices = []
    for (let i = 0; i < numberOfInstallments; i++) {
      const invoiceNumber = await generateUniqueInvoiceNumber()

      console.log(`Creating invoice ${i + 1}/${numberOfInstallments}:`, invoiceNumber)

      const invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          clientId,
          projectId: project.id,
          status: 'draft',
          subtotal: amountPerInstallment,
          tps: 0,
          tvq: 0,
          total: amountPerInstallment,
          items: {
            create: {
              description: `Versement ${i + 1}/${numberOfInstallments} - ${name}`,
              amount: amountPerInstallment,
              date: new Date(),
            },
          },
        },
      })

      invoices.push(invoice)
    }

    console.log(`Created ${invoices.length} invoices for payment plan`)

    // Envoyer l'email au client avec l'entente
    try {
      const confirmUrl = `${APP_URL}/agreements/${token}/confirm`

      console.log('Sending payment agreement email to:', client.email)
      console.log('Confirm URL:', confirmUrl)

      await resend.emails.send({
        from: PAYMENT_AGREEMENT_FROM_EMAIL,
        to: client.email,
        subject: `Entente de paiement - ${name}`,
        react: PaymentAgreementEmail({
          projectName: name,
          description: description || '',
          totalAmount: totalBudget,
          numberOfInstallments,
          amountPerInstallment,
          frequency,
          confirmUrl,
        }),
      })

      console.log('Payment agreement email sent successfully')
    } catch (error) {
      console.error('Error sending payment agreement email:', error)
      // Continue même si l'email échoue
    }
  }

  return NextResponse.json(project, { status: 201 })
}
