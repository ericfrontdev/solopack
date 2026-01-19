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

    // Validation 1: Type MIME strict (logos seulement)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/svg+xml',
    ]

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Seuls JPEG, PNG, WebP et SVG sont acceptés.' },
        { status: 400 }
      )
    }

    // Validation 2: Taille (max 2MB pour un logo)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 2MB.' },
        { status: 400 }
      )
    }

    // Convertir le fichier en base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validation 3: Vérifier le magic number (sauf pour SVG qui est XML)
    if (file.type !== 'image/svg+xml') {
      const signature = buffer.toString('hex', 0, 4)
      const validSignatures = [
        'ffd8ffe0', // JPEG
        'ffd8ffe1', // JPEG
        'ffd8ffe2', // JPEG
        '89504e47', // PNG
        '52494646', // WebP (RIFF)
      ]

      if (!validSignatures.some(sig => signature.startsWith(sig.substring(0, 8)))) {
        logger.error('Invalid logo file signature:', signature)
        return NextResponse.json(
          { error: 'Fichier corrompu ou type non valide.' },
          { status: 400 }
        )
      }
    }

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
