/**
 * lib/encryption.ts
 * AES-256-GCM symmetric encryption for user interest data.
 * Key from ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 * Graceful: returns null if key missing or on error.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt plaintext string.
 * Returns "iv:authTag:ciphertext" (all hex) or null on failure.
 */
export function encrypt(plaintext: string): string | null {
  try {
    const key = getKey();
    if (!key) return null;

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch {
    return null;
  }
}

/**
 * Decrypt "iv:authTag:ciphertext" (hex) back to plaintext.
 * Returns null on failure or invalid input.
 */
export function decrypt(encrypted: string): string | null {
  try {
    const key = getKey();
    if (!key) return null;

    const parts = encrypted.split(':');
    if (parts.length !== 3) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}
