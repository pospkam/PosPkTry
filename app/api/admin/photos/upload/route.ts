/**
 * POST /api/admin/photos/upload
 *
 * Принимает уже обработанное (resize на клиенте) изображение,
 * анализирует через Vision AI (Anthropic → OpenRouter)
 * и сохраняет в S3 (или локально при отсутствии S3).
 *
 * Поля FormData:
 *   file     — изображение (jpg/png/webp/heic), уже изменённое в размере клиентом
 *   profile  — (опционально) hero | activity | bento | gallery
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import path from 'path';
import fs from 'fs/promises';
import { isS3Configured, uploadToS3 } from '@/lib/storage/s3';

export const dynamic = 'force-dynamic';

// ── Конфиги профилей (только метаданные — resize делается на клиенте) ──────────

const PROFILE_DIRS: Record<string, string> = {
  hero:     'hero',
  activity: 'activities',
  bento:    'bento',
  gallery:  'gallery',
};

type Profile = 'hero' | 'activity' | 'bento' | 'gallery';

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

async function analyzeImage(imageBase64: string): Promise<AnalysisResult | null> {
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
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
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
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
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

  const MAX_SIZE = 60 * 1024 * 1024; // 60 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс. 60 МБ)' }, { status: 400 });
  }

  const profileOverride = formData.get('profile') as Profile | null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // AI-анализ: клиент уже снизил размер → используем буфер напрямую
    const imageBase64 = buffer.toString('base64');
    const analysis = await analyzeImage(imageBase64);

    const profile: Profile = profileOverride ?? (analysis?.profile as Profile) ?? 'gallery';
    const dir = PROFILE_DIRS[profile] ?? 'gallery';

    // Безопасное имя файла
    const baseName = (
      analysis?.filename ||
      path.basename(file.name, path.extname(file.name))
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/gi, '')
        .toLowerCase()
    ).slice(0, 60);

    const outFilename = `${baseName}.jpg`;
    const s3Key = `images/${dir}/${outFilename}`;

    let servePath: string;

    // 1. S3 — основной storage (production)
    if (isS3Configured) {
      const result = await uploadToS3(s3Key, buffer, 'image/jpeg');
      servePath = result.url;
    } else {
      // 2. Fallback: public/ → /tmp/
      const publicDir = path.join(process.cwd(), 'public', 'images', dir);
      const tmpDir = path.join('/tmp', 'tourhab-uploads', 'images', dir);

      let outDir = publicDir;
      servePath = `/images/${dir}/${outFilename}`;

      try {
        await fs.mkdir(publicDir, { recursive: true });
        await fs.access(publicDir, 2 /* fs.constants.W_OK */);
      } catch {
        outDir = tmpDir;
        servePath = `/api/photos/images/${dir}/${outFilename}`;
        await fs.mkdir(tmpDir, { recursive: true });
      }

      const outPath = path.join(outDir, outFilename);
      await fs.writeFile(outPath, buffer);
    }

    return NextResponse.json({
      ok: true,
      filename: outFilename,
      savedPath: servePath,
      profile,
      dir,
      sizeKb: Math.round(buffer.length / 1024),
      analysis: analysis ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
