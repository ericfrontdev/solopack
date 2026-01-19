import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { ZodError } from 'zod'
import { validateBody, validationError, registerSchema } from '@/lib/validations'
import { rateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Rate limiting: 5 registrations per hour per IP
  const clientIp = getClientIp(req)
  const rateLimitResult = rateLimit(clientIp, {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Trop de tentatives d\'inscription. Veuillez réessayer plus tard.',
  })

  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    // Validate request body with Zod
    const { name, email, password, company } = await validateBody(req, registerSchema)

    // Vérifier les paramètres beta
    const settings = await prisma.systemSettings.findFirst()

    if (settings?.betaEnabled) {
      // Compter le nombre d'utilisateurs actuels
      const userCount = await prisma.user.count()

      if (userCount >= settings.maxBetaUsers) {
        return NextResponse.json(
          { error: 'auth.betaLimitReached' },
          { status: 403 }
        )
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'auth.userAlreadyExists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        company: company || null,
      },
    })

    const rateLimitHeaders = getRateLimitHeaders(clientIp, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })

    return NextResponse.json(
      { message: 'Utilisateur créé avec succès', userId: user.id },
      { status: 201, headers: rateLimitHeaders }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error)
    }
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'auth.userCreationError' },
      { status: 500 }
    )
  }
}
