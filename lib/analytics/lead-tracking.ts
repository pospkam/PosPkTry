/**
 * lib/analytics/lead-tracking.ts
 * Отслеживание событий для конверсионной воронки
 */

declare global {
  interface Window {
    ym?: (id: number, method: string, goal: string, params?: Record<string, unknown>) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export interface LeadEvent {
  event_name: string;
  event_category: string;
  event_label?: string;
  event_value?: number;
  route_id?: string;
  source?: string;
}

/**
 * Отправить событие в Yandex.Metrika
 * Используется для трекинга воронки: view → click → submit
 */
export function trackLeadEvent(event: LeadEvent) {
  if (typeof window === 'undefined') return;

  const metrikaId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

  // Yandex.Metrika
  if (window.ym && metrikaId) {
    window.ym(parseInt(metrikaId, 10), 'reachGoal', event.event_name, {
      category: event.event_category,
      label: event.event_label,
      value: event.event_value,
      route_id: event.route_id,
      source: event.source,
    });
  }

  // Google Analytics (если подключен)
  if (window.gtag) {
    window.gtag('event', event.event_name, {
      event_category: event.event_category,
      event_label: event.event_label,
      value: event.event_value,
      route_id: event.route_id,
      source: event.source,
    });
  }

  // Локальный логинг
  console.debug('[Lead Tracking]', event);
}

/**
 * События конверсионной воронки
 */
export const LEAD_EVENTS = {
  // Просмотр маршрута
  VIEW_ROUTE: { event_name: 'view_route', event_category: 'routes' },

  // Клик на LeadButton
  CLICK_LEAD_BUTTON: { event_name: 'click_lead_button', event_category: 'cta' },

  // Открытие формы (step 1 — phone)
  OPEN_LEAD_FORM_PHONE: { event_name: 'open_lead_form_phone', event_category: 'form' },

  // Заполнение phone и переход к деталям
  LEAD_FORM_PHONE_FILLED: { event_name: 'lead_form_phone_filled', event_category: 'form' },

  // Открытие step 2 (детали)
  OPEN_LEAD_FORM_DETAILS: { event_name: 'open_lead_form_details', event_category: 'form' },

  // Отправка формы
  SUBMIT_LEAD: { event_name: 'submit_lead', event_category: 'conversion' },

  // Успешная отправка
  LEAD_SUCCESS: { event_name: 'lead_success', event_category: 'conversion' },

  // Ошибка при отправке
  LEAD_ERROR: { event_name: 'lead_error', event_category: 'error' },

  // Клик на affiliate link
  CLICK_AFFILIATE_LINK: { event_name: 'click_affiliate', event_category: 'monetization' },
} as const;
