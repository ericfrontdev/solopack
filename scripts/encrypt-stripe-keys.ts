/**
 * Migration script to encrypt existing Stripe secret keys in the database
 *
 * This script:
 * 1. Finds all users with unencrypted Stripe keys
 * 2. Encrypts them using AES-256-GCM
 * 3. Updates the database with encrypted values
 *
 * Usage:
 *   npx tsx scripts/encrypt-stripe-keys.ts
 *
 * IMPORTANT:
 * - Ensure ENCRYPTION_KEY is set in your .env file
 * - Backup your database before running this script
 * - This script is idempotent (safe to run multiple times)
 */

import { PrismaClient } from '@prisma/client'
import { encrypt, isEncrypted } from '../lib/crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Starting Stripe key encryption migration...\n')

  try {
    // Find all users with Stripe keys
    const users = await prisma.user.findMany({
      where: {
        stripeSecretKey: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        stripeSecretKey: true,
      },
    })

    console.log(`Found ${users.length} user(s) with Stripe keys\n`)

    if (users.length === 0) {
      console.log('✅ No keys to encrypt. Migration complete!')
      return
    }

    let encryptedCount = 0
    let alreadyEncryptedCount = 0
    let errorCount = 0

    for (const user of users) {
      if (!user.stripeSecretKey) continue

      // Check if already encrypted
      if (isEncrypted(user.stripeSecretKey)) {
        console.log(`  ⏭️  User ${user.email} - Key already encrypted, skipping`)
        alreadyEncryptedCount++
        continue
      }

      try {
        // Encrypt the key
        const encryptedKey = encrypt(user.stripeSecretKey)

        // Update in database
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeSecretKey: encryptedKey },
        })

        console.log(`  ✅ User ${user.email} - Key encrypted successfully`)
        encryptedCount++
      } catch (error) {
        console.error(`  ❌ User ${user.email} - Encryption failed:`, error)
        errorCount++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`  - Total users with keys: ${users.length}`)
    console.log(`  - Newly encrypted: ${encryptedCount}`)
    console.log(`  - Already encrypted: ${alreadyEncryptedCount}`)
    console.log(`  - Errors: ${errorCount}`)

    if (errorCount > 0) {
      console.log('\n⚠️  Some keys failed to encrypt. Please check the errors above.')
      process.exit(1)
    }

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
