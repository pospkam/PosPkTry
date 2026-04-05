import { getMolmoWebConfig } from '@/lib/ai/provider-config';

export interface MolmoAuditResult {
  verdict: 'good' | 'warn' | 'reject';
  quality: number;
  relevance: number;
  safety: number;
  reasons: string[];
  suggestions: string[];
  provider: 'molmo_web';
  model: string;
  raw_preview?: string;
}

function clampScore(input: unknown, fallback = 50): number {
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeArray(input: unknown, limit = 5): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function parseAuditJson(text: string, model: string): MolmoAuditResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};

  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }

  const verdict = parsed.verdict === 'good' || parsed.verdict === 'warn' || parsed.verdict === 'reject'
    ? parsed.verdict
    : 'warn';

  return {
    verdict,
    quality: clampScore(parsed.quality, 55),
    relevance: clampScore(parsed.relevance, 55),
    safety: clampScore(parsed.safety, 70),
    reasons: normalizeArray(parsed.reasons, 6),
    suggestions: normalizeArray(parsed.suggestions, 6),
    provider: 'molmo_web',
    model,
    raw_preview: text.slice(0, 280),
  };
}

async function imageUrlToBase64(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`Не удалось скачать изображение: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Изображение пустое');
  }

  return Buffer.from(arrayBuffer).toString('base64');
}

function normalizeMolmoRawText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.output === 'string') return d.output;
    if (typeof d.text === 'string') return d.text;
    if (typeof d.result === 'string') return d.result;
  }
  return JSON.stringify(data);
}

export async function auditImageWithMolmo(imageUrl: string): Promise<MolmoAuditResult> {
  const cfg = getMolmoWebConfig();
  if (!cfg) {
    throw new Error('MolmoWeb не настроен: отсутствует MOLMO_WEB_URL');
  }

  const endpoint = `${cfg.baseUrl.replace(/\/$/, '')}${cfg.endpointPath.startsWith('/') ? '' : '/'}${cfg.endpointPath}`;
  const prompt = [
    'Оцени фото туристического тура Камчатки.',
    'Верни СТРОГО JSON:',
    '{',
    '  "verdict": "good|warn|reject",',
    '  "quality": 0-100,',
    '  "relevance": 0-100,',
    '  "safety": 0-100,',
    '  "reasons": ["..."],',
    '  "suggestions": ["..."]',
    '}',
    'Критерии: визуальное качество, релевантность туризму Камчатки, безопасность контента.',
    'Только JSON, без markdown.',
  ].join('\n');

  let res: Response;
  if (cfg.mode === 'native') {
    const imageBase64 = await imageUrlToBase64(imageUrl);
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        image_base64: imageBase64,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } else {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Ты строгий модератор контента туристической платформы.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`MolmoWeb HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = cfg.mode === 'native'
    ? normalizeMolmoRawText(data)
    : (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('MolmoWeb вернул пустой ответ');
  }

  return parseAuditJson(content, cfg.model);
}
