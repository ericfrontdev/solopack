import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { v2 as cloudinary } from 'cloudinary'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// POST /api/upload - Upload image to Cloudinary
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Rate limiting: 20 uploads per 15 minutes per user
    const rateLimitResult = rateLimit(`upload:${session.user.id}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Trop d\'uploads. Veuillez réessayer dans quelques minutes.',
    })

    if (rateLimitResult) {
      return rateLimitResult
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Validation 1: Type MIME (images seulement)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ]

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Seules les images (JPEG, PNG, GIF, WebP) sont acceptées.' },
        { status: 400 }
      )
    }

    // Validation 2: Taille du fichier (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB en bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 5MB.' },
        { status: 400 }
      )
    }

    // Validation 3: Nom du fichier (caractères sécurisés seulement)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    if (sanitizedName !== file.name) {
      logger.debug('Filename sanitized:', { original: file.name, sanitized: sanitizedName })
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validation 4: Vérifier le magic number (signature du fichier)
    const signature = buffer.toString('hex', 0, 4)
    const validSignatures = [
      'ffd8ffe0', // JPEG
      'ffd8ffe1', // JPEG
      'ffd8ffe2', // JPEG
      '89504e47', // PNG
      '47494638', // GIF
      '52494646', // WebP (RIFF)
    ]

    if (!validSignatures.some(sig => signature.startsWith(sig.substring(0, 8)))) {
      logger.error('Invalid file signature:', signature)
      return NextResponse.json(
        { error: 'Fichier corrompu ou type non valide.' },
        { status: 400 }
      )
    }

    // Upload vers Cloudinary
    const result = await new Promise<{secure_url: string; public_id: string}>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'solopack-feedback',
          resource_type: 'image', // Images seulement (plus de 'auto')
          // Optimisations automatiques
          transformation: [
            { width: 1920, crop: 'limit' }, // Max 1920px de large
            { quality: 'auto' }, // Compression auto
            { fetch_format: 'auto' }, // Format optimal (WebP si supporté)
          ],
        },
        (error, uploadResult) => {
          if (error) reject(error)
          else resolve(uploadResult as {secure_url: string; public_id: string})
        }
      ).end(buffer)
    })

    const rateLimitHeaders = getRateLimitHeaders(`upload:${session.user.id}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    })

    return NextResponse.json(
      {
        url: result.secure_url,
        publicId: result.public_id,
      },
      { headers: rateLimitHeaders }
    )
  } catch (error) {
    logger.error('Error uploading to Cloudinary:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'image' },
      { status: 500 }
    )
  }
}
