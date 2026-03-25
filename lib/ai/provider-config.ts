/**
 * AI Provider fallback configuration.
 * Used when Timeweb env vars aren't applying correctly.
 * Environment variables ALWAYS take priority over these fallbacks.
 *
 * Server-side only (lib/), never exposed to client.
 */

// OpenRouter fallback — overridden by OR_API_KEY or OPENROUTER_API_KEY env var
const OR_FALLBACK = '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';

export function getOpenRouterKey(): string | null {
  return process.env.OR_API_KEY || process.env.OPENROUTER_API_KEY || OR_FALLBACK || null;
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
