/**
 * Flights Service — подбор рейсов на Камчатку
 * Integrates Aviasales API via deeplinks
 *
 * Main routes:
 * - Moscow (MOW) → Petropavlovsk (PKC)
 * - St. Petersburg (LED) → PKC
 * - Vladivostok (VVO) → PKC
 * - Novosibirsk (OVB) → PKC
 *
 * Docs: https://www.aviasales.ru/ (requires API key request)
 * For now: we use deeplinks with marker tracking
 */

export interface Flight {
  id: string;
  airline: string;
  departure_city: string;
  departure_code: string;
  arrival_city: 'Петропавловск-Камчатский';
  arrival_code: 'PKC';
  price_from_rub: number;
  duration_hours: number;
  stops: number;
  link: string;
}

export interface FlightRecommendation {
  primary_route: Flight;
  alternative_routes: Flight[];
  avg_price: number;
  discount_available: boolean;
  seasonal_notes: string;
}

// Marker для Aviasales (tourhab.ru account)
const AVIASALES_MARKER = '402896';

// Основные маршруты в/из Петропавловска
const MAJOR_DEPARTURE_CODES = [
  { code: 'MOW', city: 'Москва', distance: 6500 },
  { code: 'LED', city: 'Санкт-Петербург', distance: 7000 },
  { code: 'VVO', city: 'Владивосток', distance: 1200 },
  { code: 'OVB', city: 'Новосибирск', distance: 4000 },
];

// Кэшированные примерные цены (обновляется раз в неделю)
const PRICE_CACHE: Record<string, { avg_rub: number; min_rub: number; last_updated: string }> = {
  'MOW-PKC': { avg_rub: 24000, min_rub: 16000, last_updated: '2026-03-31' },
  'LED-PKC': { avg_rub: 26000, min_rub: 18000, last_updated: '2026-03-31' },
  'VVO-PKC': { avg_rub: 12000, min_rub: 8000, last_updated: '2026-03-31' },
  'OVB-PKC': { avg_rub: 18000, min_rub: 12000, last_updated: '2026-03-31' },
};

/**
 * Определить примерную длительность полёта по маршруту
 */
function estimateDuration(departure_code: string): number {
  const durations: Record<string, number> = {
    'MOW': 8.5,  // с пересадкой
    'LED': 9.0,  // с пересадкой
    'VVO': 3.0,  // прямой
    'OVB': 5.5,  // с пересадкой
  };
  return durations[departure_code] || 6;
}

/**
 * Построить deeplink на Aviasales
 */
function buildAviasalesLink(from: string, to: string, marker: string = AVIASALES_MARKER): string {
  // Aviasales deeplink format: https://www.aviasales.ru/search/{FROM}{TO}1
  // Параметры: adults=2, children=0, infants=0, marker={marker}
  const params = new URLSearchParams({
    adults: '2',
    children: '0',
    marker,
  });
  return `https://www.aviasales.ru/search/${from}${to}1?${params.toString()}`;
}

/**
 * Рекомендовать рейсы на основе местоположения туриста (если известно)
 */
export function recommendFlights(tourist_location_code?: string): FlightRecommendation {
  // Если местоположение известно — рекомендуем из этого города
  // Иначе — Москву (наиболее популярная точка отправления)
  const primary_from = tourist_location_code || 'MOW';
  const primary_city = MAJOR_DEPARTURE_CODES.find(r => r.code === primary_from);

  if (!primary_city) {
    throw new Error(`Unknown departure city: ${primary_from}`);
  }

  const pk_cache = PRICE_CACHE[`${primary_from}-PKC`];
  if (!pk_cache) {
    throw new Error(`No price data for ${primary_from}-PKC`);
  }

  const primary_flight: Flight = {
    id: `${primary_from}-PKC-primary`,
    airline: 'S7/Aeroflot',
    departure_city: primary_city.city,
    departure_code: primary_from,
    arrival_city: 'Петропавловск-Камчатский',
    arrival_code: 'PKC',
    price_from_rub: pk_cache.min_rub,
    duration_hours: estimateDuration(primary_from),
    stops: primary_from === 'VVO' ? 0 : 1,
    link: buildAviasalesLink(primary_from, 'PKC'),
  };

  // Альтернативные маршруты (с пересадкой в других городах)
  const alternatives: Flight[] = MAJOR_DEPARTURE_CODES
    .filter(r => r.code !== primary_from)
    .map(r => {
      const cache = PRICE_CACHE[`${r.code}-PKC`];
      return {
        id: `${r.code}-PKC-alt`,
        airline: 'Multi-airline',
        departure_city: r.city,
        departure_code: r.code,
        arrival_city: 'Петропавловск-Камчатский',
        arrival_code: 'PKC',
        price_from_rub: cache?.min_rub || 15000,
        duration_hours: estimateDuration(r.code),
        stops: r.code === 'VVO' ? 0 : 1,
        link: buildAviasalesLink(r.code, 'PKC'),
      };
    });

  const all_prices = [primary_flight.price_from_rub, ...alternatives.map(f => f.price_from_rub)];
  const avg_price = Math.round(all_prices.reduce((a, b) => a + b) / all_prices.length);

  return {
    primary_route: primary_flight,
    alternative_routes: alternatives,
    avg_price,
    discount_available: false, // TODO: Integrate real-time Aviasales API
    seasonal_notes: isSummerSeason() ? 'Пиковый сезон — цены выше' : 'Низкий сезон — есть скидки',
  };
}

/**
 * Определить текущий сезон на Камчатке
 */
function isSummerSeason(): boolean {
  const month = new Date().getMonth(); // 0-11
  return month >= 5 && month <= 8; // June-September
}

/**
 * @deprecated Для будущей интеграции с Aviasales Search API
 * Требует отдельной заявки и API key
 */
export async function searchFlightsRealtime(
  from: string,
  to: string = 'PKC',
  departure_date?: string
): Promise<Flight[]> {
  // TODO: Implement Aviasales Search API
  // https://support.skyscanner.com/ (Aviasales uses Skyscanner on backend)
  // Live flight search with real-time prices
  return [];
}
