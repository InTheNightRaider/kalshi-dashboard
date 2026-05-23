/**
 * AES-256-GCM encryption for sensitive user credentials stored in Clerk metadata.
 *
 * KEY ROTATION
 * ------------
 * ENCRYPTION_KEY      - the CURRENT 64-hex-char (32-byte) key. Used for every
 *                       new encrypt(). Always required.
 * ENCRYPTION_KEY_OLD  - OPTIONAL, comma-separated list of PREVIOUS keys
 *                       (also 64-hex-char each). Used ONLY as fallback on
 *                       decrypt, so values written before a rotation still
 *                       open. New writes never use these.
 *
 * Rotation workflow:
 *   1. Generate a new key:
 *        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   2. In Netlify env vars: move the existing ENCRYPTION_KEY value into
 *      ENCRYPTION_KEY_OLD (append with comma if not empty), then set
 *      ENCRYPTION_KEY to the new value.
 *   3. Redeploy. Old values still decrypt via fallback, new writes use the
 *      new key. After a comfortable interval you can drop the old entry.
 *
 * If decrypt() fails against EVERY available key it throws
 * DecryptionFailedError. The /api/user route catches this and returns a 4xx
 * telling the user to re-paste, rather than returning garbage that signs but
 * fails downstream at Kalshi.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

export class DecryptionFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecryptionFailedError'
  }
}

function parseHexKey(hex: string, label: string): Buffer {
  const trimmed = hex.trim()
  if (trimmed.length !== 64 || !/^[0-9a-f]{64}$/i.test(trimmed)) {
    throw new Error(
      `${label} must be exactly 64 hex characters (32 bytes). ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    )
  }
  return Buffer.from(trimmed, 'hex')
}

function getCurrentKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) {
    throw new Error(
      'ENCRYPTION_KEY env var is missing. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return parseHexKey(hex, 'ENCRYPTION_KEY')
}

function getAllKeys(): Buffer[] {
  const keys: Buffer[] = [getCurrentKey()]
  const old = process.env.ENCRYPTION_KEY_OLD
  if (old && old.trim()) {
    const parts = old.split(',').map(s => s.trim()).filter(Boolean)
    parts.forEach((p, i) => keys.push(parseHexKey(p, `ENCRYPTION_KEY_OLD[${i}]`)))
  }
  return keys
}

export function encrypt(plaintext: string): string {
  const key = getCurrentKey()
  const iv  = randomBytes(12)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(encoded: string): string {
  const parts = encoded.split(':')
  if (parts.length !== 3) {
    throw new DecryptionFailedError('Invalid encrypted value format (expected iv:tag:data)')
  }
  const [ivHex, tagHex, dataHex] = parts
  const iv      = Buffer.from(ivHex,  'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const data    = Buffer.from(dataHex, 'hex')

  const keys = getAllKeys()
  let lastErr: Error | null = null
  for (let i = 0; i < keys.length; i++) {
    try {
      const decipher = createDecipheriv(ALGORITHM, keys[i], iv)
      decipher.setAuthTag(authTag)
      const out = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
      return out
    } catch (e: any) {
      lastErr = e
    }
  }

  throw new DecryptionFailedError(
    `Could not decrypt stored credential with any configured key ` +
    `(tried ${keys.length} key${keys.length === 1 ? '' : 's'}). ` +
    `This usually means ENCRYPTION_KEY was rotated and the old key was not preserved ` +
    `in ENCRYPTION_KEY_OLD. The user must re-paste their credentials to re-encrypt with the current key.` +
    (lastErr ? ` (last error: ${lastErr.message})` : '')
  )
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p))
}

export function safeDecrypt(value: string): string {
  if (!value) return value
  return isEncrypted(value) ? decrypt(value) : value
}
