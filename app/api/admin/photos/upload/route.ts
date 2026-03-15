/**
 * POST /api/admin/photos/upload
 *
 * Загружает фото, анализирует через Vision AI (Anthropic → OpenRouter),
 * изменяет размер под нужный профиль и сохраняет в public/images/
 *
 * Поля FormData:
 *   file     — изображение (jpg/png/webp/heic)
 *   profile  — (опционально) hero | activity | bento | gallery
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

// ── Профили ───────────────────────────────────────────────────────────────────

const PROFILES = {
  hero:     { width: 1920, height: null as null, quality: 85 },
  activity: { width: 800,  height: 600,          quality: 82 },
  bento:    { width: 1200, height: 800,          quality: 85 },
  gallery:  { width: 1200, height: 900,          quality: 85 },
} as const;

const PROFILE_DIRS: Record<string, string> = {
  hero:     'hero',
  activity: 'activities',
  bento:    'bento',
  gallery:  'gallery',
};

type Profile = keyof typeof PROFILES;

// ── Vision AI ─────────────────────────────────────────────────────────────────

const VISION_PROMPT = `Это фото для туристической платформы Камчатки.

Ответь СТРОГО в формате JSON (без markdown):
{
  "subject": "что на фото (1 строка, русский)",
  "category": "volcano|fishing|sea|hotsprings|helicopter|snowmobile|jeep|trekking|bears|rafting|dogsled|winter|landscape|people",
  "profile": "hero|activity|bento|gallery",
  "filename": "snake_case_без_расширения",
  "quality": "excellent|good|skip"
}

profile: hero=широкий пейзаж для главного экрана, activity=чёткое действие, bento=пейзаж, gallery=атмосфера
quality: skip=размыто/тёмно/нерелевантно`;

interface AnalysisResult {
  subject: string;
  category: string;
  profile: Profile;
  filename: string;
  quality: 'excellent' | 'good' | 'skip';
}

async function analyzeImage(thumbBase64: string): Promise<AnalysisResult | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  try {
    if (anthropicKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: thumbBase64 } },
              { type: 'text', text: VISION_PROMPT },
            ],
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { content?: Array<{ text?: string }> };
        const text = data?.content?.[0]?.text ?? '';
        const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        return JSON.parse(clean) as AnalysisResult;
      }
    }

    if (openrouterKey) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openrouterKey}` },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4-5',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${thumbBase64}` } },
              { type: 'text', text: VISION_PROMPT },
            ],
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        const text = data?.choices?.[0]?.message?.content ?? '';
        const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        return JSON.parse(clean) as AnalysisResult;
      }
    }
  } catch {
    // Vision недоступен — вернём null, UI покажет ручные поля
  }
  return null;
}

// ── Обработчик ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const adminOrResponse = await requireAdmin(request);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Поле file обязательно' }, { status: 400 });
  }

  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс. 50 МБ)' }, { status: 400 });
  }

  const profileOverride = formData.get('profile') as Profile | null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Миниатюра для AI-анализа
    const thumbBuf = await sharp(buffer)
      .resize(768, null, { withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    const thumbBase64 = thumbBuf.toString('base64');

    // Анализ через Vision AI
    const analysis = await analyzeImage(thumbBase64);

    const profile: Profile = profileOverride ?? (analysis?.profile as Profile) ?? 'gallery';
    const cfg = PROFILES[profile] ?? PROFILES.gallery;
    const dir = PROFILE_DIRS[profile] ?? 'gallery';

    // Безопасное имя файла
    const baseName = (
      analysis?.filename ||
      path.basename(file.name, path.extname(file.name))
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/gi, '')
        .toLowerCase()
    ).slice(0, 60);

    const outDir = path.join(process.cwd(), 'public', 'images', dir);
    await fs.mkdir(outDir, { recursive: true });

    const outFilename = `${baseName}.jpg`;
    const outPath = path.join(outDir, outFilename);

    // Resize + сохранение
    let pipeline = sharp(buffer);
    if (cfg.height) {
      pipeline = pipeline.resize(cfg.width, cfg.height, { fit: 'cover', position: 'centre' });
    } else {
      pipeline = pipeline.resize(cfg.width, null, { withoutEnlargement: true });
    }
    const info = await pipeline.jpeg({ quality: cfg.quality, mozjpeg: true }).toFile(outPath);

    return NextResponse.json({
      ok: true,
      filename: outFilename,
      savedPath: `/images/${dir}/${outFilename}`,
      profile,
      dir,
      sizeKb: Math.round(info.size / 1024),
      analysis: analysis ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
