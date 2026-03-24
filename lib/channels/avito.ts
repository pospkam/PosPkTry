/**
 * Avito Channel Adapter
 * Docs: https://developers.avito.ru/
 *
 * Два режима интеграции:
 *
 * РЕЖИМ 1 — Автозагрузка XML (рекомендуется для старта)
 *   - Хостим XML-фид на /api/channels/avito/feed
 *   - Регистрируем URL в личном кабинете Авито → Автозагрузка
 *   - Авито сам обновляет листинги каждые несколько часов
 *   - Не нужен OAuth, не нужно одобрение API
 *   - В описании каждого тура: ссылка на tourhab.ru/hub/tour/{id}
 *
 * РЕЖИМ 2 — REST API (после получения одобрения)
 *   - OAuth 2.0 Client Credentials
 *   - POST /core/v1/accounts/{user_id}/items — создать объявление
 *   - GET /messenger/v3/... — читать входящие сообщения (лиды)
 *   - Env: AVITO_CLIENT_ID, AVITO_CLIENT_SECRET, AVITO_USER_ID
 *
 * Категория для рыболовных туров:
 *   Услуги → Активный отдых → Рыбалка, охота
 */

import type {
  ChannelAdapter, ChannelBooking, ChannelName,
  ChannelTour, PushBookingInput, PushBookingResult,
} from './types';

const AVITO_API = 'https://api.avito.ru';

// ── OAuth token (кешируем на время жизни) ─────────────────────────────────

let _token: string | null = null;
let _tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiresAt) return _token;

  const clientId     = process.env.AVITO_CLIENT_ID;
  const clientSecret = process.env.AVITO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('AVITO_CLIENT_ID / AVITO_CLIENT_SECRET не настроены');

  const res = await fetch(`${AVITO_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json() as { access_token: string; expires_in: number };
  _token = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

// ── XML Автозагрузка ───────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tourhab.ru';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tourDescription(tour: ChannelTour): string {
  const base = tour.short_description ?? tour.description ?? '';
  const included = Array.isArray(tour.included) && tour.included.length > 0
    ? '\n\nВключено: ' + tour.included.join(', ')
    : '';
  const link = `\n\nПодробнее и бронирование: ${SITE_URL}/hub/tour/${tour.id}`;
  return (base + included + link).slice(0, 7000);
}

export function generateAvitoXmlFeed(tours: ChannelTour[]): string {
  const items = tours
    .filter(t => t.tripster_experience_id !== 'skip')  // фильтр при необходимости
    .map(tour => {
      const price = Math.round(tour.base_price);
      const photos = (tour.photos ?? []).slice(0, 10)
        .map(url => `      <Image url="${escapeXml(url)}"/>`)
        .join('\n');

      return `
  <Ad>
    <Id>${tour.id}</Id>
    <Category>Охота и рыбалка</Category>
    <Title>${escapeXml(tour.title.slice(0, 50))}</Title>
    <Description>${escapeXml(tourDescription(tour))}</Description>
    <Price>${price}</Price>
    <Address>Камчатский край</Address>
    <AllowEmail>0</AllowEmail>
    <ContactPhone>1</ContactPhone>
    ${photos ? `<Images>\n${photos}\n    </Images>` : ''}
    <Params>
      <Param name="Вид отдыха">Рыбалка</Param>
      <Param name="Длительность">${tour.duration_hours ? Math.round(tour.duration_hours / 8) + ' дн.' : 'по договорённости'}</Param>
      <Param name="Количество участников">до ${tour.max_participants} чел.</Param>
    </Params>
  </Ad>`.trim();
    }).join('\n\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Ads formatVersion="3" target="Avito.ru">
  ${items}
</Ads>`;
}

// ── Messenger API — чтение входящих лидов ────────────────────────────────

export async function fetchAvitoLeads(userId: string): Promise<ChannelBooking[]> {
  const token = await getToken();

  const res = await fetch(
    `${AVITO_API}/messenger/v3/accounts/${userId}/chats?unread_only=true`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (!res.ok) return [];

  const data = await res.json() as { chats?: unknown[] };
  const chats = data.chats ?? [];

  // Возвращаем как ChannelBooking с пустой датой — это лиды, не полноценные брони
  return chats.map((chat: unknown) => {
    const c = chat as Record<string, unknown>;
    const context = c.context as Record<string, unknown> | undefined;
    const users = c.users as Array<Record<string, unknown>> | undefined;
    const caller = users?.find(u => u.id !== userId);

    return {
      external_id:   String(c.id ?? ''),
      channel:       'avito' as ChannelName,
      tour_id:       Number((context?.value as Record<string, unknown>)?.id ?? 0),
      status:        'new' as const,
      tourist_name:  String(caller?.name ?? 'Не указано'),
      tourist_email: '',
      tourist_phone: '',
      participants:  1,
      booking_date:  '',
      amount:        0,
      raw_payload:   c as Record<string, unknown>,
    };
  });
}

// ── ChannelAdapter interface ──────────────────────────────────────────────

export const avitoAdapter: ChannelAdapter = {
  name: 'avito' as ChannelName,

  async pushBooking(_input: PushBookingInput): Promise<PushBookingResult> {
    // Авито — доска объявлений, не маркетплейс.
    // Бронирование происходит на tourhab.ru — ссылка зашита в описание тура.
    // Авито используется только для генерации лидов (трафик → наш сайт).
    return { success: false, error: 'Авито не поддерживает прямое бронирование — пользователи направляются на tourhab.ru' };
  },

  async pollOrders(_since: Date): Promise<ChannelBooking[]> {
    const userId = process.env.AVITO_USER_ID;
    if (!userId || !process.env.AVITO_CLIENT_ID) return [];  // не настроен

    try {
      return await fetchAvitoLeads(userId);
    } catch {
      return [];
    }
  },
};
