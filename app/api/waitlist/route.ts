import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    const { name, email } = await req.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'waitlist.allFieldsRequired' },
        { status: 400 }
      )
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'waitlist.invalidEmail' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur n'est pas déjà inscrit
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'waitlist.alreadyRegistered' },
        { status: 400 }
      )
    }

    // Ajouter à la liste Brevo
    const brevoApiKey = process.env.BREVO_API_KEY
    const brevoListId = process.env.BREVO_WAITLIST_ID || '3'

    if (!brevoApiKey) {
      logger.error('BREVO_API_KEY not configured')
      return NextResponse.json(
        { error: 'waitlist.errorAdding' },
        { status: 500 }
      )
    }

    // Séparer prénom et nom
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
        },
        listIds: [parseInt(brevoListId)],
        updateEnabled: true, // Met à jour si le contact existe déjà
      })
    })

    const brevoData = await brevoResponse.json()

    // Si le contact existe déjà dans Brevo
    if (!brevoResponse.ok) {
      logger.error('Brevo API error - Status:', brevoResponse.status)
      logger.error('Brevo API error - Response:', JSON.stringify(brevoData, null, 2))

      if (brevoData.code === 'duplicate_parameter') {
        return NextResponse.json(
          { error: 'waitlist.alreadyOnWaitlist' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'waitlist.errorAdding', details: brevoData.message || 'Unknown error' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'waitlist.successfullyAdded' },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error adding to waitlist:', error)
    return NextResponse.json(
      { error: 'waitlist.errorAdding' },
      { status: 500 }
    )
  }
}
