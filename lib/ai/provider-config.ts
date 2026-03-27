/**
 * AI Provider key configuration.
 * Centralized key access — all providers read keys through here.
 *
 * Server-side only (lib/), never exposed to client.
 */

export function getOpenRouterKey(): string | null {
  return process.env.OR_API_KEY
    || process.env.OPENROUTER_API_KEY
    || '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';
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

export function getMiniMaxKey(): { apiKey: string; groupId: string } | null {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) return null;
  return { apiKey, groupId };
}

export function getYandexKey(): { apiKey: string; folderId: string } | null {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) return null;
  return { apiKey, folderId };
}
