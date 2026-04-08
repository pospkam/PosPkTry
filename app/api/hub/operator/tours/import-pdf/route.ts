/**
 * POST /api/hub/operator/tours/import-pdf
 * Принимает PDF-файл тура, извлекает структурированные данные через Gemini,
 * возвращает предзаполненные поля для формы создания тура.
 *
 * Multipart form-data: { file: File (application/pdf, max 8MB) }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { callGeminiPDF } from '@/lib/ai/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

const EXTRACT_PROMPT = `Ты — ассистент туристической платформы Камчатки.
Проанализируй этот PDF-документ с описанием тура и извлеки структурированные данные.

Верни ТОЛЬКО валидный JSON объект без markdown-разметки, комментариев и пояснений.

Схема JSON:
{
  "title": "Название тура (строка, обязательно)",
  "description": "Подробное описание тура (строка)",
  "short_description": "Краткое описание до 500 символов (строка)",
  "activity_type": "Один из: trekking | thermal | boat_trip | rafting | fishing | bears | helicopter | jeep | other",
  "location_type": "Один из: volcano | hot_spring | bay | lake | mountain | river | geyser | other",
  "location_name": "Название места/локации (строка)",
  "base_price": 0,
  "price_unit": "per_person | per_tour | per_day_per_person",
  "max_participants": 0,
  "min_participants": 0,
  "duration_hours": 0,
  "difficulty": "easy | medium | hard | expert",
  "season_start": "YYYY-MM-DD или null",
  "season_end": "YYYY-MM-DD или null",
  "included": ["что включено в стоимость (массив строк)"],
  "not_included": ["что не включено (массив строк)"],
  "what_to_bring": ["что взять с собой (массив строк)"],
  "tags": ["теги активности (массив строк)"]
}

Правила:
- Если данные не найдены — используй null или пустой массив
- Цены всегда в рублях (убери знаки валют, пробелы)
- duration_hours: если указаны дни — умножь на 8
- activity_type: рыбалка → fishing, вулкан/треккинг → trekking, вертолёт → helicopter, медведи → bears
- location_type: вулкан → volcano, горячие источники → hot_spring, бухта/море → bay
- Верни ТОЛЬКО JSON, начиная с { и заканчивая }`;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Файл не передан' },
        { status: 400 },
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Поддерживается только PDF' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Файл слишком большой (максимум 8 МБ)' },
        { status: 400 },
      );
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');

    // Extract tour data via Gemini
    const raw = await callGeminiPDF(pdfBase64, EXTRACT_PROMPT);

    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Не удалось извлечь данные из PDF. Попробуйте другой файл.' },
        { status: 422 },
      );
    }

    // Parse JSON from response (strip markdown fences if present)
    const jsonText = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Не удалось разобрать ответ AI. Попробуйте ещё раз.' },
        { status: 422 },
      );
    }

    // Sanitise numeric fields (sometimes AI returns strings)
    const toNum = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const result = {
      title:             typeof extracted.title === 'string' ? extracted.title.trim() : '',
      description:       typeof extracted.description === 'string' ? extracted.description.trim() : null,
      short_description: typeof extracted.short_description === 'string' ? extracted.short_description.trim().slice(0, 500) : null,
      activity_type:     typeof extracted.activity_type === 'string' ? extracted.activity_type : 'other',
      location_type:     typeof extracted.location_type === 'string' ? extracted.location_type : 'other',
      location_name:     typeof extracted.location_name === 'string' ? extracted.location_name.trim() : '',
      base_price:        toNum(extracted.base_price),
      price_unit:        typeof extracted.price_unit === 'string' ? extracted.price_unit : 'per_person',
      max_participants:  toNum(extracted.max_participants),
      min_participants:  toNum(extracted.min_participants),
      duration_hours:    toNum(extracted.duration_hours),
      difficulty:        typeof extracted.difficulty === 'string' ? extracted.difficulty : null,
      season_start:      typeof extracted.season_start === 'string' && extracted.season_start !== 'null' ? extracted.season_start : null,
      season_end:        typeof extracted.season_end === 'string' && extracted.season_end !== 'null' ? extracted.season_end : null,
      included:          Array.isArray(extracted.included) ? (extracted.included as unknown[]).filter(x => typeof x === 'string') : [],
      not_included:      Array.isArray(extracted.not_included) ? (extracted.not_included as unknown[]).filter(x => typeof x === 'string') : [],
      what_to_bring:     Array.isArray(extracted.what_to_bring) ? (extracted.what_to_bring as unknown[]).filter(x => typeof x === 'string') : [],
      tags:              Array.isArray(extracted.tags) ? (extracted.tags as unknown[]).filter(x => typeof x === 'string') : [],
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка обработки файла', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 },
    );
  }
}
