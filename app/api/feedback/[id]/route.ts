import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/feedback/[id] - Récupérer un feedback spécifique
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

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        messages: {
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
        }
      }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback non trouvé' }, { status: 404 })
    }

    // Vérifier les permissions
    const isSuperAdmin = await prisma.superAdmin.findUnique({
      where: { userId: session.user.id }
    })

    // User peut voir seulement ses propres feedbacks, admin peut tout voir
    if (!isSuperAdmin && feedback.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Mettre à jour les timestamps de lecture
    const updateData: { viewedAt?: Date; lastAdminReadAt?: Date; lastUserReadAt?: Date } = {}

    if (isSuperAdmin) {
      // Si admin et feedback pas encore vu, marquer comme vu
      if (!feedback.viewedAt) {
        updateData.viewedAt = new Date()
      }
      // Toujours mettre à jour lastAdminReadAt quand admin ouvre le feedback
      updateData.lastAdminReadAt = new Date()
    } else {
      // User normal - mettre à jour lastUserReadAt
      updateData.lastUserReadAt = new Date()
    }

    // Mettre à jour si nécessaire
    if (Object.keys(updateData).length > 0) {
      await prisma.feedback.update({
        where: { id },
        data: updateData
      })
    }

    return NextResponse.json(feedback)
  } catch (error) {
    logger.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du feedback' },
      { status: 500 }
    )
  }
}

// PATCH /api/feedback/[id] - Mettre à jour un feedback (admin seulement)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'user est super admin
    const isSuperAdmin = await prisma.superAdmin.findUnique({
      where: { userId: session.user.id }
    })

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, priority, adminNote, linkedIssue } = body

    const data: {
      status?: string
      priority?: string
      adminNote?: string
      linkedIssue?: string
      resolvedAt?: Date
    } = {}

    if (status !== undefined) data.status = status
    if (priority !== undefined) data.priority = priority
    if (adminNote !== undefined) data.adminNote = adminNote
    if (linkedIssue !== undefined) data.linkedIssue = linkedIssue

    // Si marqué comme resolved, ajouter resolvedAt
    if (status === 'resolved' && !data.resolvedAt) {
      data.resolvedAt = new Date()
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data,
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

    return NextResponse.json(feedback)
  } catch (error) {
    logger.error('Error updating feedback:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du feedback' },
      { status: 500 }
    )
  }
}

// DELETE /api/feedback/[id] - Supprimer un feedback (admin seulement)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'user est super admin
    const isSuperAdmin = await prisma.superAdmin.findUnique({
      where: { userId: session.user.id }
    })

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params

    await prisma.feedback.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting feedback:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du feedback' },
      { status: 500 }
    )
  }
}
