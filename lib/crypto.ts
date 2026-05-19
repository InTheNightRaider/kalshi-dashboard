/**
 * AES-256-GCM encryption for sensitive user credentials stored in Clerk metadata.
 *
 * The ENCRYPTION_KEY env var is a 64-char hex string (32 bytes) stored only in
 * Netlify — never in Clerk, never in the repo. Even if Clerk's database were
 * breached, encrypted values are useless without this key.
 *
 * Generate a key:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY env var is missing or wrong length. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypts a plaintext string.
 * Returns a single string:  iv:authTag:ciphertext  (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(12) // 96-bit IV recommended for GCM

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypts a value produced by encrypt().
 */
export function decrypt(encoded: string): string {
  const key = getKey()
  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted value format')

  const [ivHex, tagHex, dataHex] = parts
  const iv      = Buffer.from(ivHex,  'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const data    = Buffer.from(dataHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/**
 * Returns true if the string looks like an encrypted value (iv:tag:data).
 * Used to handle existing unencrypted values gracefully during migration.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p))
}

/**
 * Safe decrypt — if the value isn't encrypted (legacy), returns as-is.
 * Allows a zero-downtime migration to encryption.
 */
export function safeDecrypt(value: string): string {
  if (!value) return value
  return isEncrypted(value) ? decrypt(value) : value
}
