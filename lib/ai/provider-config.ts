/**
 * AI Provider key configuration.
 * Centralized key access — all providers read keys through here.
 *
 * Server-side only (lib/), never exposed to client.
 */

export function getOpenRouterKey(): string | null {
  return process.env.OR_API_KEY
    || process.env.OPENROUTER_API_KEY
    || null;
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

export function getMolmoWebConfig(): {
  baseUrl: string;
  apiKey: string | null;
  model: string;
  mode: 'native' | 'openai';
  endpointPath: string;
} | null {
  const baseUrl = process.env.MOLMO_WEB_URL || process.env.MOLMOWEB_URL || '';
  if (!baseUrl) return null;

  const mode = (process.env.MOLMO_WEB_MODE || 'openai').toLowerCase() === 'native'
    ? 'native'
    : 'openai';
  const endpointPath = process.env.MOLMO_WEB_ENDPOINT
    || (mode === 'native' ? '/predict' : '/v1/chat/completions');

  return {
    baseUrl,
    apiKey: process.env.MOLMO_WEB_API_KEY || process.env.MOLMOWEB_API_KEY || null,
    model: process.env.MOLMO_WEB_MODEL || 'allenai/Molmo-7B-D-0924',
    mode,
    endpointPath,
  };
}

export function isMolmoPilotEnabled(): boolean {
  return process.env.MOLMO_PILOT_ENABLED === 'true';
}
