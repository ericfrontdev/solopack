import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendFeedbackCreatedNotification } from '@/lib/feedback-emails'
import { logger } from '@/lib/logger'

// GET /api/feedback - Liste des feedbacks (admin voit tout, user voit les siens)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Check if user is super admin
    const isSuperAdmin = await prisma.superAdmin.findUnique({
      where: { userId: session.user.id }
    })

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Build where clause
    const where: {
      userId?: string
      status?: string
      type?: string
    } = {}

    // Si pas super admin, user voit seulement ses feedbacks
    if (!isSuperAdmin) {
      where.userId = session.user.id
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(feedbacks)
  } catch (error) {
    logger.error('Error fetching feedbacks:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des feedbacks' },
      { status: 500 }
    )
  }
}

// POST /api/feedback - Créer un nouveau feedback
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    // Check if feedback system is enabled
    const settings = await prisma.systemSettings.findFirst()
    if (settings && !settings.feedbackSystemEnabled) {
      return NextResponse.json(
        { error: 'Le système de feedback est actuellement désactivé' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      type,
      severity,
      title,
      message,
      screenshot,
      isAnonymous,
      pageUrl,
      pageTitle,
      userAgent,
      screenSize,
      deviceType,
    } = body

    // Validation
    if (!type || !severity || !title || !message) {
      return NextResponse.json(
        { error: 'Les champs type, severity, title et message sont requis' },
        { status: 400 }
      )
    }

    // Si anonyme, userId = null, sinon on prend l'user connecté
    const userId = isAnonymous ? null : session?.user?.id || null

    const feedback = await prisma.feedback.create({
      data: {
        type,
        severity,
        title,
        message,
        screenshot: screenshot || null,
        isAnonymous: isAnonymous || false,
        userId,
        pageUrl: pageUrl || '',
        pageTitle: pageTitle || null,
        userAgent: userAgent || null,
        screenSize: screenSize || null,
        deviceType: deviceType || null,
      },
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

    // Send email notification to admins (don't await to avoid blocking response)
    sendFeedbackCreatedNotification(feedback.id).catch((error) => {
      logger.error('Failed to send feedback notification email:', error)
    })

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    logger.error('Error creating feedback:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du feedback' },
      { status: 500 }
    )
  }
}
