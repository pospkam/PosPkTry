/**
 * AI-автотеггинг фотографий туров
 * Использует Claude Vision API (Anthropic) для анализа изображений
 */

export interface TourImageTags {
  landscape: string[];
  activity: string[];
  difficulty: 'easy' | 'moderate' | 'extreme';
  season: string[];
  features: string[];
}

// Допустимые значения тегов
const ALLOWED_LANDSCAPE = ['volcano', 'geyser', 'ocean', 'forest', 'snow', 'mountain', 'river', 'lake', 'beach', 'tundra'];
const ALLOWED_ACTIVITY = ['hiking', 'fishing', 'boat', 'helicopter', 'skiing', 'camping', 'kayaking', 'snowmobile', 'trekking'];
const ALLOWED_DIFFICULTY = ['easy', 'moderate', 'extreme'];
const ALLOWED_SEASON = ['summer', 'winter', 'spring', 'autumn'];
const ALLOWED_FEATURES = ['wildlife', 'bears', 'salmon', 'birds', 'volcanology', 'aurora', 'hot_springs'];

function sanitizeTags(tags: TourImageTags): TourImageTags {
  return {
    landscape: tags.landscape.filter((t) => ALLOWED_LANDSCAPE.includes(t)).slice(0, 5),
    activity: tags.activity.filter((t) => ALLOWED_ACTIVITY.includes(t)).slice(0, 4),
    difficulty: ALLOWED_DIFFICULTY.includes(tags.difficulty) ? tags.difficulty : 'moderate',
    season: tags.season.filter((t) => ALLOWED_SEASON.includes(t)).slice(0, 4),
    features: tags.features.filter((t) => ALLOWED_FEATURES.includes(t)).slice(0, 5),
  };
}

function parseTagsFromText(text: string): TourImageTags {
  // Пробуем распарсить JSON из ответа
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        landscape: Array.isArray(parsed.landscape) ? parsed.landscape : [],
        activity: Array.isArray(parsed.activity) ? parsed.activity : [],
        difficulty: parsed.difficulty ?? 'moderate',
        season: Array.isArray(parsed.season) ? parsed.season : [],
        features: Array.isArray(parsed.features) ? parsed.features : [],
      };
    } catch {
      // Fallback: парсим по ключевым словам
    }
  }

  // Fallback: ищем ключевые слова прямо в тексте
  const lower = text.toLowerCase();
  return {
    landscape: ALLOWED_LANDSCAPE.filter((t) => lower.includes(t)),
    activity: ALLOWED_ACTIVITY.filter((t) => lower.includes(t)),
    difficulty: lower.includes('extreme') ? 'extreme' : lower.includes('easy') ? 'easy' : 'moderate',
    season: ALLOWED_SEASON.filter((t) => lower.includes(t)),
    features: ALLOWED_FEATURES.filter((t) => lower.includes(t)),
  };
}

// ── Anthropic Claude Vision анализ ───────────────────────────
async function analyzeWithClaude(imageUrl: string): Promise<TourImageTags | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `Analyze this Kamchatka tourism photo and return JSON tags ONLY.

Return STRICTLY this JSON format:
{
  "landscape": ["volcano"|"geyser"|"ocean"|"forest"|"snow"|"mountain"|"river"|"lake"|"beach"|"tundra"],
  "activity": ["hiking"|"fishing"|"boat"|"helicopter"|"skiing"|"camping"|"kayaking"|"snowmobile"|"trekking"],
  "difficulty": "easy"|"moderate"|"extreme",
  "season": ["summer"|"winter"|"spring"|"autumn"],
  "features": ["wildlife"|"bears"|"salmon"|"birds"|"volcanology"|"aurora"|"hot_springs"]
}

Rules:
- Only include tags clearly visible or strongly implied in the image
- difficulty: easy=flat trail/family, moderate=hills/some gear, extreme=glacier/summit
- Return ONLY the JSON object, no other text`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: imageUrl } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`Claude API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text ?? '';
    const raw = parseTagsFromText(text);
    return sanitizeTags(raw);
  } catch (err) {
    console.error('Claude vision error:', err);
    return null;
  }
}

// ── Groq Vision fallback (llama vision) ──────────────────────
async function analyzeWithGroqVision(imageUrl: string): Promise<TourImageTags | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'low' },
              },
              {
                type: 'text',
                text: `Tag this Kamchatka tourism photo. Return ONLY JSON:
{"landscape":["volcano"|"geyser"|"ocean"|"forest"|"snow"|"mountain"|"river"|"lake"|"beach"|"tundra"],"activity":["hiking"|"fishing"|"boat"|"helicopter"|"skiing"|"camping"],"difficulty":"easy"|"moderate"|"extreme","season":["summer"|"winter"|"spring"|"autumn"],"features":["wildlife"|"bears"|"salmon"|"birds"|"aurora"|"hot_springs"]}`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    const raw = parseTagsFromText(text);
    return sanitizeTags(raw);
  } catch {
    return null;
  }
}

// ── Основная функция: теггинг одного изображения ─────────────
export async function tagTourImage(imageUrl: string): Promise<TourImageTags | null> {
  // Пробуем Claude → Groq Vision
  const result = (await analyzeWithClaude(imageUrl)) ?? (await analyzeWithGroqVision(imageUrl));
  return result;
}

// ── Теггинг всех фото тура (агрегированный результат) ─────────
export async function tagTourPhotos(photoUrls: string[]): Promise<TourImageTags> {
  const validUrls = photoUrls.filter((u) => u?.startsWith('http'));

  if (validUrls.length === 0) {
    return { landscape: [], activity: [], difficulty: 'moderate', season: [], features: [] };
  }

  // Анализируем первые 3 фото (экономим API запросы)
  const urlsToProcess = validUrls.slice(0, 3);
  const results: TourImageTags[] = [];

  for (const url of urlsToProcess) {
    const tags = await tagTourImage(url);
    if (tags) results.push(tags);
    await new Promise((r) => setTimeout(r, 100)); // небольшая пауза
  }

  if (results.length === 0) {
    return { landscape: [], activity: [], difficulty: 'moderate', season: [], features: [] };
  }

  // Агрегируем: объединяем массивы и берём уникальные значения
  const merged: TourImageTags = {
    landscape: [...new Set(results.flatMap((r) => r.landscape))].slice(0, 5),
    activity: [...new Set(results.flatMap((r) => r.activity))].slice(0, 4),
    difficulty: results[0].difficulty, // берём из первого фото
    season: [...new Set(results.flatMap((r) => r.season))].slice(0, 4),
    features: [...new Set(results.flatMap((r) => r.features))].slice(0, 5),
  };

  return merged;
}
