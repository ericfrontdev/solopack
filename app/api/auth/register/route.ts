import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { ZodError } from 'zod'
import { validateBody, validationError, registerSchema } from '@/lib/validations'

export async function POST(req: Request) {
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

    return NextResponse.json(
      { message: 'Utilisateur créé avec succès', userId: user.id },
      { status: 201 }
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
