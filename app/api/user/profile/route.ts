import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, isEncrypted, maskSensitiveValue } from '@/lib/crypto'

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      email,
      company,
      phone,
      address,
      neq,
      tpsNumber,
      tvqNumber,
      chargesTaxes,
      paymentProvider,
      paypalEmail,
      stripeSecretKey,
      autoRemindersEnabled,
      reminderMiseEnDemeureTemplate
    } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Le nom et l\'email sont requis' },
        { status: 400 }
      )
    }

    // Encrypt Stripe secret key if provided and not already encrypted
    let encryptedStripeKey: string | null = null
    if (stripeSecretKey) {
      if (isEncrypted(stripeSecretKey)) {
        // Already encrypted, keep as is
        encryptedStripeKey = stripeSecretKey
      } else {
        // Encrypt the new key
        try {
          encryptedStripeKey = encrypt(stripeSecretKey.trim())
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
        name,
        email,
        company: company || null,
        phone: phone || null,
        address: address || null,
        neq: neq || null,
        tpsNumber: tpsNumber || null,
        tvqNumber: tvqNumber || null,
        chargesTaxes: chargesTaxes ?? false,
        paymentProvider: paymentProvider || null,
        paypalEmail: paypalEmail || null,
        stripeSecretKey: encryptedStripeKey,
        autoRemindersEnabled: autoRemindersEnabled ?? false,
        reminderMiseEnDemeureTemplate: reminderMiseEnDemeureTemplate || null,
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
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    )
  }
}
