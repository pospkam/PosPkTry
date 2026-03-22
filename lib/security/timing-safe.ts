/**
 * lib/security/timing-safe.ts
 * Timing-safe constant comparison
 * Prevents timing attacks on secrets and API keys
 */

import { timingSafeEqual } from 'crypto';

/**
 * Compare two secrets in a timing-safe manner
 * Prevents attackers from measuring response time to infer correct characters
 *
 * Example:
 *   if (timingSafeCompare(userInput, secret)) { ... }
 */
export function timingSafeCompare(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) {
    // Still needs to be timing-safe
    // Use Buffer.alloc to avoid timing info leak
    try {
      timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    } catch {
      // Expected to always throw for unequal length
    }
    return false;
  }

  // If lengths differ, use a dummy comparison to maintain constant time
  if (provided.length !== expected.length) {
    try {
      timingSafeEqual(Buffer.alloc(expected.length), Buffer.from(expected));
    } catch {
      // Intentional - we want to waste time
    }
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}
