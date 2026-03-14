/**
 * POST /api/admin/run-migration
 * Временный эндпоинт для применения миграции 033 + seed.
 * Защищён секретом MIGRATION_SECRET из env.
 * УДАЛИТЬ после успешного запуска!
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

const MIGRATION_033 = `
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS hero_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS season_info JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS reviews_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_public ON partners(is_public) WHERE is_public = TRUE;
`;

const SEED_FISHINGKAM = `
INSERT INTO partners (
  name, category, description, short_description, slug,
  contact, legal_info, operator_info,
  hero_image, gallery, services, features, faq, season_info, reviews_data, contacts, location,
  rating, review_count, is_verified, is_public, status
) VALUES (
  'Камчатская рыбалка',
  'operator',
  'Рыболовные туры на реке Камчатка. Лицензионный участок №1182, площадь 365,5 га, протяжённость 21 500 м. Чавыча, кижуч, нерка, горбуша, кета, микижа, хариус, кунжа, голец. Зимняя и летняя рыбалка круглый год.',
  'Рыболовные туры на реке Камчатка. Лицензионный участок №1182. Зимняя и летняя рыбалка от 15 000 руб/сут.',
  'kamchatskaya-rybalka',
  '{"phone": "+79147822222", "phone2": "+79992997007"}'::jsonb,
  '{"companyName": "ООО «Камчатская рыбалка»", "inn": "4100050147", "ogrn": "1244100000869", "address": "684005, Камчатский край, г. Елизово, ул. Звёздная, д. 1«А», каб. 14", "license": "Рыболовный участок №1182 (р. Камчатка), договор №02/2023-л от 22.05.2023", "fishingArea": "365,5 га, 21 500 м"}'::jsonb,
  '{"tourRegistryNumber": null, "hasFinancialGuarantee": false}'::jsonb,
  '/images/fishingkam/2025-01-27_142444.jpg',
  '["2025-01-27_142444.jpg","2025-01-27_142653.jpg","2025-01-27_142814.jpg","2025-01-27_142818_1.jpg","2025-01-27_142551.jpg","2025-01-27_142551_1.jpg","2025-02-10_151416.jpg","2025-02-10_151421.jpg","2025-02-10_151433.jpg","2025-02-10_151441.jpg","2025-02-10_151450.jpg","2025-01-09_113928_1_.jpg"]'::jsonb,
  '[{"title":"Однодневный тур","desc":"Один насыщенный день на реке. Подходит для первого знакомства с камчатской рыбалкой.","prices":{"winter":"от 15 000 руб","summer":"от 18 000 руб"},"includes":["Гид на весь день","Снаряжение","Питание на берегу","Трансфер до места"]},{"title":"Многодневный тур","desc":"Несколько дней погружения в дикую природу. Максимальный шанс поймать трофей.","prices":{"winter":"от 18 000 руб/сут","summer":"от 25 000 руб/сут"},"includes":["Проживание на базе","Питание 3 раза","Гид каждый день","Снаряжение"]},{"title":"Семейный тур","desc":"Специальная программа для семей с детьми. Безопасно, интересно, незабываемо.","prices":{"winter":"по запросу","summer":"по запросу"},"includes":["Адаптация под детей","Упрощённые снасти","Проживание","Питание"]}]'::jsonb,
  '[{"icon":"Shield","title":"Лицензионный участок","desc":"Участок №1182 (р. Камчатка), 365 га, 21,5 км. Договор №02/2023-л от 22.05.2023."},{"icon":"Fish","title":"Богатый рыбный запас","desc":"Чавыча, кижуч, нерка, горбуша, кета, микижа, хариус, кунжа, голец."},{"icon":"Home","title":"Комфортная база","desc":"Двухэтажный корпус 400 м2 — номера, кухня, столовая, душ, туалет."},{"icon":"Calendar","title":"Круглый год","desc":"Зима: подлёдная рыбалка. Лето: лосось. Работаем 12 месяцев."},{"icon":"Users","title":"Опытные гиды","desc":"Анатолий и Александр — местные профессионалы с многолетним опытом."},{"icon":"Star","title":"Техники ловли","desc":"Спиннинг, нахлыст и другие методы — от новичков до опытных рыбаков."}]'::jsonb,
  '[{"q":"Какое время года лучше для рыбалки?","a":"Летний сезон: июнь — сентябрь (тихоокеанские лососи). Зимний: декабрь — март (подлёдная рыбалка). Мы работаем круглый год."},{"q":"Что включено в стоимость?","a":"Трансфер до места ловли, услуги гида, снаряжение, питание и проживание. Дополнительные услуги — отдельно."},{"q":"Можно ли забрать пойманную рыбу?","a":"Да. В рамках разрешённого объёма рыба ваша. Помогаем обработать и упаковать. Организуем копчение или вяление за доп. плату."},{"q":"Снаряжение нужно везти с собой?","a":"Не обязательно. Предоставляем основное снаряжение. Если есть любимые снасти — берите с собой."}]'::jsonb,
  '[{"months":"Июнь — Июль","fish":"Чавыча (королевский лосось)","season":"Лето"},{"months":"Июль — Август","fish":"Нерка, горбуша, кета","season":"Лето"},{"months":"Август — Сентябрь","fish":"Кижуч, микижа (радужная форель)","season":"Лето"},{"months":"Декабрь — Март","fish":"Подлёдная: микижа, хариус, кунжа, голец","season":"Зима"}]'::jsonb,
  '[{"name":"Степан","date":"26 декабря 2025","text":"Анатолий профессионал своего дела! Выбирайте и не пожалеете!","source":"Авито","verified":true},{"name":"Артём","date":"24 февраля 2026","text":"Все отлично","source":"Авито","verified":true}]'::jsonb,
  '[{"name":"Анатолий","phone":"+79147822222","role":"Гид"},{"name":"Александр","phone":"+79992997007","role":"Гид"},{"name":"Офис","phone":"+79247808011","role":"Офис","address":"г. Елизово, ул. Звёздная, 1А, каб. 14"}]'::jsonb,
  '{"lat":53.1838,"lng":158.3804,"address":"г. Елизово, ул. Звёздная, 1А, каб. 14"}'::jsonb,
  5.0, 2, TRUE, TRUE, 'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  hero_image = EXCLUDED.hero_image,
  gallery = EXCLUDED.gallery,
  services = EXCLUDED.services,
  features = EXCLUDED.features,
  faq = EXCLUDED.faq,
  season_info = EXCLUDED.season_info,
  reviews_data = EXCLUDED.reviews_data,
  contacts = EXCLUDED.contacts,
  location = EXCLUDED.location,
  legal_info = EXCLUDED.legal_info,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();
`;

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migration-secret');
  const expected = process.env.MIGRATION_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    await query(MIGRATION_033, []);
    results.push('Migration 033: OK');
  } catch (e) {
    results.push(`Migration 033 ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await query(SEED_FISHINGKAM, []);
    results.push('Seed kamchatskaya-rybalka: OK');
  } catch (e) {
    results.push(`Seed ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({ results });
}
