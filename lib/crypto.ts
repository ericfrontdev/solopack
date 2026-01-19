import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32 // 256 bits

/**
 * Get encryption key from environment variable
 * The key must be a 64-character hex string (32 bytes when decoded)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "logger.debug(crypto.randomBytes(32).toString(\'hex\'))"'
    )
  }

  if (keyHex.length !== KEY_LENGTH * 2) {
    throw new Error(
      `ENCRYPTION_KEY must be a ${KEY_LENGTH * 2}-character hex string (${KEY_LENGTH} bytes). ` +
      `Current length: ${keyHex.length}`
    )
  }

  try {
    return Buffer.from(keyHex, 'hex')
  } catch {
    throw new Error('ENCRYPTION_KEY must be a valid hex string')
  }
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns format: iv:authTag:encrypted
 *
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format "iv:authTag:encrypted"
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string')
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':')
}

/**
 * Decrypt a string that was encrypted with encrypt()
 * Expects format: iv:authTag:encrypted
 *
 * @param encryptedData - The encrypted string in format "iv:authTag:encrypted"
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string')
  }

  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected "iv:authTag:encrypted"')
  }

  const [ivHex, authTagHex, encrypted] = parts

  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length}`)
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: ${authTag.length}`)
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }
    throw new Error('Decryption failed')
  }
}

/**
 * Check if a string is already encrypted (has the expected format)
 *
 * @param data - The string to check
 * @returns true if the string appears to be encrypted
 */
export function isEncrypted(data: string | null): boolean {
  if (!data) return false

  const parts = data.split(':')
  if (parts.length !== 3) return false

  const [ivHex, authTagHex, encrypted] = parts

  // Check if parts are valid hex strings with expected lengths
  const isValidHex = (str: string) => /^[0-9a-f]+$/i.test(str)

  return (
    ivHex.length === IV_LENGTH * 2 &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    encrypted.length > 0 &&
    isValidHex(ivHex) &&
    isValidHex(authTagHex) &&
    isValidHex(encrypted)
  )
}

/**
 * Mask a sensitive value for display purposes
 * Shows only the last 4 characters
 *
 * @param value - The value to mask
 * @returns Masked string like "***...sk_live_1234"
 */
export function maskSensitiveValue(value: string | null): string | null {
  if (!value) return null
  if (value.length <= 4) return '***'
  return '***...' + value.slice(-4)
}
