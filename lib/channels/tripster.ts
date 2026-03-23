/**
 * Tripster Channel Adapter
 * Docs: https://tripster.atlassian.net/wiki/spaces/PEO/
 *
 * Как работает:
 * 1. Туры создаются ВРУЧНУЮ в дашборде Tripster → получаем experience_id
 * 2. Этот ID сохраняется в operator_tours.tripster_experience_id
 * 3. При бронировании на tourhab.ru → pushBooking() регистрирует заказ в Tripster
 * 4. pollOrders() раз в 30 мин подтягивает новые заказы с Tripster → наша БД
 *
 * Токен: получить через email guides@tripster.ru с аккаунта оператора
 * Env: TRIPSTER_TOKEN, TRIPSTER_PARTNER_NAME
 */

import type {
  ChannelAdapter, ChannelBooking, ChannelName,
  PushBookingInput, PushBookingResult,
} from './types';

const BASE = 'https://experience.tripster.ru/api';

function getConfig(): { token: string; partner: string } {
  const token   = process.env.TRIPSTER_TOKEN;
  const partner = process.env.TRIPSTER_PARTNER_NAME;
  if (!token || !partner) throw new Error('TRIPSTER_TOKEN или TRIPSTER_PARTNER_NAME не настроен');
  return { token, partner };
}

function headers(token: string) {
  return {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

// Маппинг activity_type нашей платформы → Tripster movement_type
const MOVEMENT_TYPE: Record<string, string> = {
  fishing:     'boat',
  boat_trip:   'boat',
  trekking:    'walking',
  helicopter:  'helicopter',
  jeep:        'car',
  bears:       'walking',
  snowmobile:  'snowmobile',
  thermal:     'walking',
};

export const tripsterAdapter: ChannelAdapter = {
  name: 'tripster' as ChannelName,

  /**
   * Регистрирует бронирование с tourhab.ru в Tripster
   * Требует: tour.tripster_experience_id должен быть заполнен
   */
  async pushBooking(input: PushBookingInput): Promise<PushBookingResult> {
    const { tour, tourist_name, tourist_email, tourist_phone,
            participants, booking_date, booking_time, message } = input;

    if (!tour.tripster_experience_id) {
      return { success: false, error: 'tripster_experience_id не заполнен для этого тура' };
    }

    const { token, partner } = getConfig();

    const body = {
      experience:       tour.tripster_experience_id,
      persons_count:    participants,
      date:             booking_date,
      time:             booking_time ?? '09:00:00',
      email:            tourist_email,
      name:             tourist_name,
      phone:            tourist_phone,
      message_to_guide: message ?? '',
    };

    const res = await fetch(
      `${BASE}/partners/${partner}/external_orders/`,
      {
        method: 'POST',
        headers: {
          ...headers(token),
          'Idempotency-Key': `tourhab-${tour.id}-${booking_date}-${tourist_email}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      return { success: false, error: JSON.stringify(data) };
    }

    return { success: true, external_id: data.id as string };
  },

  /**
   * Подтягивает новые и изменённые заказы с Tripster
   * Вызывается кроном каждые 30 минут
   */
  async pollOrders(since: Date): Promise<ChannelBooking[]> {
    const { token } = getConfig();

    const sinceStr = since.toISOString().split('T')[0];  // YYYY-MM-DD
    const res = await fetch(
      `${BASE}/guides/v1/orders/?updated_after=${sinceStr}`,
      { headers: headers(token) }
    );

    if (!res.ok) return [];

    const data = await res.json() as { results?: unknown[] };
    const results = data.results ?? [];

    return results.map((order: unknown) => {
      const o = order as Record<string, unknown>;
      const exp = o.experience as Record<string, unknown> | undefined;
      const event = o.event as Record<string, unknown> | undefined;

      return {
        external_id:   String(o.id ?? ''),
        channel:       'tripster' as ChannelName,
        tour_id:       0,  // заполняется в channel-manager по experience_id
        status:        mapTripsterStatus(String(o.status ?? '')),
        tourist_name:  String(o.name  ?? ''),
        tourist_email: String(o.email ?? ''),
        tourist_phone: String(o.phone ?? ''),
        participants:  Number(o.persons_count ?? 1),
        booking_date:  String(event?.date ?? ''),
        amount:        Number((o.price as Record<string,unknown>)?.value ?? 0),
        raw_payload:   o as Record<string, unknown>,
      } satisfies ChannelBooking & { _experience_id?: string };
    }).map(b => {
      const o = b.raw_payload;
      const exp = o.experience as Record<string, unknown> | undefined;
      return { ...b, _experience_id: String(exp?.id ?? '') } as ChannelBooking;
    });
  },
};

function mapTripsterStatus(s: string): ChannelBooking['status'] {
  if (s === 'cancel') return 'cancelled';
  if (s === 'confirmation') return 'new';
  return 'confirmed';
}
