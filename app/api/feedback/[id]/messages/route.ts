import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendFeedbackMessageNotification } from '@/lib/feedback-emails'
import { logger } from '@/lib/logger'

// GET /api/feedback/[id]/messages - Récupérer les messages d'un feedback
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que le feedback existe et que l'user a le droit de le voir
    const feedback = await prisma.feedback.findUnique({
      where: { id }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback non trouvé' }, { status: 404 })
    }

    const isSuperAdmin = await prisma.superAdmin.findUnique({
      where: { userId: session.user.id }
    })

    // User peut voir seulement les messages de ses feedbacks, admin peut tout voir
    if (!isSuperAdmin && feedback.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const messages = await prisma.feedbackMessage.findMany({
      where: { feedbackId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(messages)
  } catch (error) {
    logger.error('Error fetching feedback messages:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des messages' },
      { status: 500 }
    )
  }
}

// POST /api/feedback/[id]/messages - Ajouter un message à un feedback
export async function POST(
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
    const { message } = body

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Le message est requis' },
        { status: 400 }
      )
    }

    // Vérifier que le feedback existe
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback non trouvé' }, { status: 404 })
    }

    const isSuperAdmin = await prisma.superAdmin.findUnique({
      where: { userId: session.user.id }
    })

    // Déterminer le type d'auteur
    const authorType = isSuperAdmin ? 'admin' : 'user'

    // Vérifier les permissions (user peut écrire sur ses feedbacks, admin sur tous)
    if (!isSuperAdmin && feedback.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Si c'est un admin qui répond, changer automatiquement le statut à "in_progress" si c'est encore "new"
    if (isSuperAdmin && feedback.status === 'new') {
      await prisma.feedback.update({
        where: { id },
        data: { status: 'in_progress' }
      })
    }

    const newMessage = await prisma.feedbackMessage.create({
      data: {
        feedbackId: id,
        authorId: session.user.id,
        authorType,
        message: message.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Send email notification (don't await to avoid blocking response)
    sendFeedbackMessageNotification(id, newMessage.id).catch((error) => {
      logger.error('Failed to send message notification email:', error)
    })

    return NextResponse.json(newMessage, { status: 201 })
  } catch (error) {
    logger.error('Error creating feedback message:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du message' },
      { status: 500 }
    )
  }
}
