/**
 * lib/ai/interest-extractor.ts
 *
 * Extracts user interests from chat messages and stores them encrypted.
 * Reuses parseInterestsFromText from routes-recommender (80+ keyword dictionary).
 */

import { encrypt, decrypt } from '@/lib/encryption';
import { parseInterestsFromText } from '@/lib/services/routes-recommender';

interface InterestScores {
  scores: Record<string, number>;
  updatedAt: number;
}

/**
 * Parse interests from a user message and merge with existing encrypted data.
 * Returns new encrypted string or null if encryption is unavailable.
 */
export function extractAndEncryptInterests(
  userMessage: string,
  existingEncrypted: string | null
): string | null {
  const parsed = parseInterestsFromText(userMessage);
  if (parsed.interests.length === 0 && !existingEncrypted) return null;

  // Decrypt existing scores
  let existing: InterestScores = { scores: {}, updatedAt: Date.now() };
  if (existingEncrypted) {
    const decrypted = decrypt(existingEncrypted);
    if (decrypted) {
      try {
        existing = JSON.parse(decrypted) as InterestScores;
      } catch {
        // corrupted — start fresh
      }
    }
  }

  // Merge new interests (+1 for each detected)
  for (const interest of parsed.interests) {
    existing.scores[interest] = (existing.scores[interest] ?? 0) + 1;
  }
  existing.updatedAt = Date.now();

  // Encrypt and return
  return encrypt(JSON.stringify(existing));
}

/**
 * Decrypt interest scores for admin analytics.
 * Returns null on failure.
 */
export function decryptInterests(encrypted: string): InterestScores | null {
  const decrypted = decrypt(encrypted);
  if (!decrypted) return null;
  try {
    return JSON.parse(decrypted) as InterestScores;
  } catch {
    return null;
  }
}
