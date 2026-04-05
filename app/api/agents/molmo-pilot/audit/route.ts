import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { auditImageWithMolmo } from '@/lib/ai/molmo-web';
import { isMolmoPilotEnabled, getMolmoWebConfig } from '@/lib/ai/provider-config';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  imageUrl: z.string().url().optional(),
  tourId: z.coerce.number().int().positive().optional(),
  dryRun: z.boolean().optional(),
}).refine((v) => Boolean(v.imageUrl || v.tourId), {
  message: 'Нужно передать imageUrl или tourId',
  path: ['imageUrl'],
});

function extractPhotoUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string' && /^https?:\/\//.test(v));
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string' && /^https?:\/\//.test(v));
      }
    } catch {
      return [];
    }
  }

  return [];
}

async function resolveImageByTourId(tourId: number): Promise<{ imageUrl: string; title: string } | null> {
  const row = await pool.query<{
    title: string;
    tour_image: string | null;
    photos: unknown;
  }>(
    `SELECT title, tour_image, photos
     FROM operator_tours
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [tourId],
  );

  const tour = row.rows[0];
  if (!tour) return null;

  const photos = extractPhotoUrls(tour.photos);
  const imageUrl = (tour.tour_image && /^https?:\/\//.test(tour.tour_image))
    ? tour.tour_image
    : photos[0];

  if (!imageUrl) return null;
  return { imageUrl, title: tour.title };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные данные', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const featureEnabled = isMolmoPilotEnabled();
  const providerCfg = getMolmoWebConfig();
  if (!featureEnabled) {
    return NextResponse.json(
      { success: false, error: 'Molmo pilot выключен (MOLMO_PILOT_ENABLED=false)' },
      { status: 409 },
    );
  }
  if (!providerCfg) {
    return NextResponse.json(
      { success: false, error: 'MolmoWeb не настроен (нет MOLMO_WEB_URL)' },
      { status: 500 },
    );
  }

  let imageUrl = parsed.data.imageUrl;
  let source: Record<string, unknown> = { mode: 'imageUrl' };

  if (!imageUrl && parsed.data.tourId) {
    const resolved = await resolveImageByTourId(parsed.data.tourId);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Не удалось получить фото тура по tourId' },
        { status: 404 },
      );
    }
    imageUrl = resolved.imageUrl;
    source = { mode: 'tourId', tourId: parsed.data.tourId, title: resolved.title };
  }

  if (!imageUrl) {
    return NextResponse.json({ success: false, error: 'Фото для аудита не найдено' }, { status: 404 });
  }

  if (parsed.data.dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      message: 'Dry-run OK: входные данные валидны, провайдер включён',
      imageUrl,
      source,
      provider: 'molmo_web',
      model: providerCfg.model,
      mode: providerCfg.mode,
      endpoint: providerCfg.endpointPath,
    });
  }

  try {
    const audit = await auditImageWithMolmo(imageUrl);

    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata)
       VALUES ('molmo_pilot_audit', $1)`,
      [
        JSON.stringify({
          provider: audit.provider,
          model: audit.model,
          image_url: imageUrl,
          source,
          verdict: audit.verdict,
          quality: audit.quality,
          relevance: audit.relevance,
          safety: audit.safety,
          ts: new Date().toISOString(),
        }),
      ],
    ).catch(() => null);

    return NextResponse.json({
      success: true,
      provider: audit.provider,
      model: audit.model,
      imageUrl,
      source,
      audit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
