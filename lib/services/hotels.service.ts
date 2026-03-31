/**
 * Hotels Service — подбор отелей в Петропавловске и близлежащих районах
 * Ostrovok.ru — основной российский сервис бронирования (работает в РФ)
 */

export interface Hotel {
  id: string;
  name: string;
  area: string;
  price_from_rub: number;
  nights: number;
  stars: number;
  amenities: string[];
  link: string;
}

export interface HotelRecommendation {
  primary_hotel: Hotel;
  alternatives: Hotel[];
  avg_price_per_night: number;
  tips: string;
}

const OSTROVOK_MARKER = '402896';
const OSTROVOK_BASE = `https://ostrovok.ru/hotel/russia/petropavlovsk_kamchatsky/?marker=${OSTROVOK_MARKER}`;

// Кэшированные популярные отели в Петропавловске
const HOTELS_CACHE: Hotel[] = [
  {
    id: 'aviator-pkc',
    name: 'Авиатор',
    area: 'Центр, Петропавловск',
    price_from_rub: 4500,
    nights: 1,
    stars: 3,
    amenities: ['Wi-Fi', 'Ресторан', 'Трансфер', 'Завтрак'],
    link: OSTROVOK_BASE,
  },
  {
    id: 'petropavlovsk-hotel',
    name: 'Петропавловск',
    area: 'Центр, Петропавловск',
    price_from_rub: 5000,
    nights: 1,
    stars: 3,
    amenities: ['Wi-Fi', 'Ресторан', 'Конференц-зал'],
    link: OSTROVOK_BASE,
  },
  {
    id: 'kamchatka-hotel',
    name: 'Камчатка',
    area: 'Центр, Петропавловск',
    price_from_rub: 3500,
    nights: 1,
    stars: 2,
    amenities: ['Wi-Fi', 'Завтрак'],
    link: OSTROVOK_BASE,
  },
  {
    id: 'lux-hotel',
    name: 'Люкс',
    area: 'Проспект Карла Маркса, Петропавловск',
    price_from_rub: 7500,
    nights: 1,
    stars: 4,
    amenities: ['Wi-Fi', 'Спа', 'Ресторан', 'Трансфер', 'Завтрак включен'],
    link: OSTROVOK_BASE,
  },
];

/**
 * Подобрать отели на основе бюджета туриста и длительности маршрута
 */
export function recommendHotels(
  budget_per_night_rub?: number,
  nights: number = 3
): HotelRecommendation {
  // Если бюджет не указан — рекомендуем среднее
  const budget = budget_per_night_rub || 4500;

  // Фильтруем по бюджету
  const available = HOTELS_CACHE.filter(h => h.price_from_rub <= budget * 1.2);

  if (available.length === 0) {
    // Если ничего не найдено по бюджету — берём самый дешёвый
    available.push(HOTELS_CACHE[HOTELS_CACHE.length - 1]);
  }

  // Сортируем по рейтингу (stars) — звёзды важнее цены
  const sorted = available.sort((a, b) => b.stars - a.stars);
  const primary = sorted[0];
  const alternatives = sorted.slice(1);

  const avg_price = Math.round(
    HOTELS_CACHE.reduce((sum, h) => sum + h.price_from_rub, 0) / HOTELS_CACHE.length
  );

  const tips_map: Record<number, string> = {
    2: 'Бюджетное размещение — идеально для короткого визита',
    3: 'Комфортное размещение с хорошим сервисом',
    4: 'Премиум-отель для полноценного отдыха',
  };

  return {
    primary_hotel: primary,
    alternatives: alternatives.slice(0, 2),
    avg_price_per_night: avg_price,
    tips: tips_map[primary.stars] || 'Проверьте рейтинги перед бронированием',
  };
}

/**
 * Estimate total cost for accommodation
 */
export function estimateAccommodationCost(
  nights: number,
  price_per_night: number
): { subtotal: number; with_meals: number } {
  return {
    subtotal: nights * price_per_night,
    with_meals: nights * price_per_night + nights * 1500, // ~1500 за еду в день
  };
}
