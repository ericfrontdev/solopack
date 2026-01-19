import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, isEncrypted, maskSensitiveValue } from '@/lib/crypto'
import { ZodError } from 'zod'
import { validateBody, validationError, updateProfileSchema } from '@/lib/validations'

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Validate request body with Zod
    const data = await validateBody(req, updateProfileSchema)

    // Encrypt Stripe secret key if provided and not already encrypted
    let encryptedStripeKey: string | undefined = undefined
    if (data.stripeSecretKey) {
      if (isEncrypted(data.stripeSecretKey)) {
        // Already encrypted, keep as is
        encryptedStripeKey = data.stripeSecretKey
      } else {
        // Encrypt the new key
        try {
          encryptedStripeKey = encrypt(data.stripeSecretKey.trim())
        } catch (error) {
          console.error('Error encrypting Stripe key:', error)
          return NextResponse.json(
            { error: 'Erreur lors du chiffrement de la clé Stripe' },
            { status: 500 }
          )
        }
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...data,
        // Override stripeSecretKey with encrypted version if provided
        ...(encryptedStripeKey !== undefined && { stripeSecretKey: encryptedStripeKey }),
      },
    })

    return NextResponse.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        company: updatedUser.company,
        phone: updatedUser.phone,
        address: updatedUser.address,
        neq: updatedUser.neq,
        tpsNumber: updatedUser.tpsNumber,
        tvqNumber: updatedUser.tvqNumber,
        chargesTaxes: updatedUser.chargesTaxes,
        paymentProvider: updatedUser.paymentProvider,
        paypalEmail: updatedUser.paypalEmail,
        // NEVER return the actual Stripe key - only indicate if one is set
        stripeSecretKey: maskSensitiveValue(updatedUser.stripeSecretKey),
        hasStripeKey: !!updatedUser.stripeSecretKey,
        autoRemindersEnabled: updatedUser.autoRemindersEnabled,
        reminderMiseEnDemeureTemplate: updatedUser.reminderMiseEnDemeureTemplate,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error)
    }
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    )
  }
}
