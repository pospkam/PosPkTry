/**
 * GET  /api/hub/operator/profile — получить профиль оператора
 * PATCH /api/hub/operator/profile — обновить профиль
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function getPartnerId(userId: string): Promise<string | null> {
  const r = await query(`SELECT id FROM partners WHERE user_id = $1 LIMIT 1`, [userId]);
  return (r.rows[0]?.id as string) ?? null;
}

export async function GET(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const partnerId = await getPartnerId(authOrResponse.userId);
  if (!partnerId) return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 });

  const r = await query(`
    SELECT
      p.id, p.name AS company_name, p.category, p.description, p.short_description,
      p.profile_status, p.onboarding_completed, p.is_public, p.is_verified,
      p.contacts, p.location, p.services, p.features,
      p.hero_image, p.logo_image,
      p.payout_method, p.payout_verified, p.commission_current,
      p.profile_review_comment,
      p.telegram_chat_id,
      u.email, u.name AS contact_name
    FROM partners p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = $1
  `, [partnerId]);

  return NextResponse.json({ success: true, data: r.rows[0] ?? null });
}

const PatchSchema = z.object({
  description:         z.string().max(2000).optional(),
  short_description:   z.string().max(300).optional(),
  website:             z.string().max(500).optional().or(z.literal('')),
  phone:               z.string().max(30).optional(),
  telegram:            z.string().max(100).optional(),
  services:            z.array(z.string().max(100)).max(20).optional(),
  features:            z.array(z.string().max(100)).max(20).optional(),
  location:            z.object({
    address: z.string().max(255).optional(),
    city:    z.string().max(100).optional(),
  }).optional(),
  complete_onboarding: z.boolean().optional(),
  telegram_chat_id:    z.number().int().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const partnerId = await getPartnerId(authOrResponse.userId);
  if (!partnerId) return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 });

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' },
      { status: 422 }
    );
  }

  const {
    description, short_description,
    website, phone, telegram,
    services, features, location,
    complete_onboarding, telegram_chat_id,
  } = parsed.data;

  // Merge contacts
  const existingRes = await query(
    `SELECT contacts FROM partners WHERE id = $1`, [partnerId]
  );
  const currentContacts = (existingRes.rows[0]?.contacts as Record<string, string>) ?? {};
  const newContacts = { ...currentContacts };
  if (phone    !== undefined) newContacts.phone    = phone;
  if (telegram !== undefined) newContacts.telegram = telegram;
  if (website  !== undefined) newContacts.website  = website;

  // Build UPDATE dynamically (updated_at handled in SQL directly)
  const params: unknown[] = [];
  const setClauses: string[] = ['updated_at = NOW()'];

  const p = (col: string, val: unknown) => {
    params.push(val);
    setClauses.push(`${col} = $${params.length}`);
  };

  if (description       !== undefined) p('description',       description);
  if (short_description !== undefined) p('short_description', short_description);
  if (services          !== undefined) p('services',          JSON.stringify(services));
  if (features          !== undefined) p('features',          JSON.stringify(features));
  if (location          !== undefined) p('location',          JSON.stringify(location));
  if (complete_onboarding)             p('onboarding_completed', true);
  if (telegram_chat_id !== undefined)  p('telegram_chat_id', telegram_chat_id);
  p('contacts', JSON.stringify(newContacts));

  params.push(partnerId);
  await query(
    `UPDATE partners SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
    params
  );

  return NextResponse.json({ success: true, message: 'Профиль сохранён' });
}
