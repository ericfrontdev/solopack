import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 })
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier est trop volumineux (max 5MB)' }, { status: 400 })
    }

    // Convertir le fichier en base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const logoUrl = `data:${file.type};base64,${base64}`

    // Mettre à jour l'utilisateur avec le logo en base64
    await prisma.user.update({
      where: { id: session.user.id },
      data: { logo: logoUrl },
    })

    return NextResponse.json({ logoUrl }, { status: 200 })
  } catch (error) {
    logger.error('Error uploading logo:', error)
    return NextResponse.json({
      error: 'Erreur lors de l\'upload du logo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Supprimer le logo de la base de données
    await prisma.user.update({
      where: { id: session.user.id },
      data: { logo: null },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error('Error deleting logo:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du logo' }, { status: 500 })
  }
}
