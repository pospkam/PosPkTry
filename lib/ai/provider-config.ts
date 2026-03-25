/**
 * AI Provider fallback configuration.
 * Used when Timeweb env vars aren't applying correctly.
 *
 * Server-side only (lib/), never exposed to client.
 */

// OpenRouter: correct key with $21 balance (verified working March 2026)
// Takes priority over stale env vars that Timeweb refuses to update.
// Once Timeweb env is fixed, set OR_API_KEY to override this.
const OR_CORRECT_KEY = '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';

export function getOpenRouterKey(): string | null {
  // OR_API_KEY is the intentional override (new env var, not stale)
  if (process.env.OR_API_KEY) return process.env.OR_API_KEY;
  // Use the correct key directly (bypasses stale OPENROUTER_API_KEY)
  return OR_CORRECT_KEY;
}

export function getDeepSeekKey(): string | null {
  return process.env.DEEPSEEK_API_KEY || null;
}

export function getAnthropicKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

export function getXaiKey(): string | null {
  return process.env.XAI_API_KEY || null;
}

export function getGeminiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

export function getMiMoKey(): string | null {
  return process.env.XIAOMI_API_KEY || null;
}

export function getYandexKey(): { apiKey: string; folderId: string } | null {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) return null;
  return { apiKey, folderId };
}
