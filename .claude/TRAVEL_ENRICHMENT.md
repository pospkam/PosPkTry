# Route Enrichment Architecture — TravelPayouts Integration

> Мечта: показать туристу НЕ просто аффилиат-ссылку, а полноценный **обогащенный маршрут** с реальными данными о рейсах, отелях, страховке, трансферах.

## Концепция

```
Маршрут "Рыбалка на Курильском озере" (3 дня, Elizovsky, рыба)
    ↓
RouteEnrichmentService.enrich(route)
    ↓
{
  route,
  flights: [
    { from: 'MOW', to: 'PKC', price: 15000, airline: 'Nordstar', link: 'aviasales.ru/...' },
    { from: 'SPB', to: 'PKC', price: 18000, airline: 'Pobeda', link: '...' },
  ],
  hotels: [
    { name: 'Radisson Kamchatka', price: 8000, rating: 4.5, link: 'hotellook.com/...' },
    { name: 'Avatcha Bay', price: 5000, rating: 4.2, link: '...' },
  ],
  insurance: {
    recommended: 'Silver (рыбалка)', // Cherehapa
    price: 1200,
    activities: ['fishing', 'trekking'],
    link: 'cherehapa.ru/...',
  },
  transfers: [
    { from: 'PKC_airport', to: 'route_start', duration: 45, price: 2500, provider: 'kiwitaxi' },
  ],
  extras: [
    { title: 'Вечерний Tripster-тур', price: 3000, link: 'tripster.ru/...' },
  ],
}
    ↓
Показать BlockedPage с интерактивной информацией
```

## Сервисы

### 1. flights.service.ts
**Поиск рейсов от города туриста на Камчатку**

```typescript
interface FlightSearchParams {
  from_city_code: string;  // 'MOW', 'SPB', 'NOV'
  to_city: 'PKC' | 'KHK';  // Petropavlovsk or Khabarovsk
  departure_date?: string; // ISO 8601
  return_date?: string;
  passengers?: number;
}

interface Flight {
  airline: string;
  departure: time;
  arrival: time;
  duration: string;
  price: number;
  currency: 'RUB' | 'USD';
  link: string; // Aviasales deeplink with marker
}

export class FlightsService {
  // Aviasales Search API требует заявки + документации
  // Пока используем cached data или обращение через proxy
  async search(params: FlightSearchParams): Promise<Flight[]>;
}
```

**Источник:** Aviasales Search API (требует отдельной заявки на support@travelpayouts.com)

---

### 2. hotels.service.ts
**Поиск отелей в Петропавловске-Камчатском**

```typescript
interface HotelSearchParams {
  city: 'Petropavlovsk-Kamchatsky' | 'Elizovo' | // другие города Камчатки
  checkin: string;  // ISO 8601
  checkout: string;
  guests: number;
  language?: 'ru' | 'en';
}

interface Hotel {
  name: string;
  rating: number;
  price: number;
  nights: number;
  currency: 'RUB';
  amenities: string[];
  distance: string; // расстояние до города
  link: string; // Hotellook deeplink with marker
}

export class HotelsService {
  // Hotellook не имеет открытого API, но есть deeplinks
  // Маршруты: https://hotellook.com/...?marker=402896
  async search(params: HotelSearchParams): Promise<Hotel[]>;
}
```

**Источник:** Hotellook deeplinks + встроенные данные из туристических справочников

---

### 3. insurance.service.ts
**Подбор страховки на основе типа маршрута**

```typescript
interface InsuranceRecommendation {
  plan: 'Basic' | 'Silver' | 'Gold' | 'Extreme';
  price: number;
  coverage: string[];
  activities: string[]; // ['fishing', 'trekking', 'helicopter']
  link: string;
}

export class InsuranceService {
  // Cherehapa API
  async recommend(activity_types: string[], budget?: number): Promise<InsuranceRecommendation>;
}
```

**Источник:** Cherehapa Insurance API с фильтром по типам активностей

---

### 4. transfers.service.ts
**Проверка доступности трансферов**

```typescript
interface TransferOption {
  provider: 'kiwitaxi' | 'yandex_taxi' | 'uber';
  from: string;
  to: string;
  duration: number; // минуты
  price_approx: number;
  link: string;
}

export class TransfersService {
  // Kiwitaxi API + кэширование
  async getOptions(from: string, to: string): Promise<TransferOption[]>;
}
```

**Источник:** Kiwitaxi API

---

### 5. route-enrichment.service.ts
**Главный координатор**

```typescript
export class RouteEnrichmentService {
  async enrich(route: RouteItem, tourist?: { city?: string }): Promise<EnrichedRouteData> {
    const [flights, hotels, insurance, transfers] = await Promise.all([
      this.flightsService.search({
        from_city_code: tourist?.city || 'MOW',
        to_city: 'PKC',
        departure_date: route.startDate,
      }),
      this.hotelsService.search({
        city: 'Petropavlovsk-Kamchatsky',
        checkin: route.startDate,
        checkout: route.endDate,
      }),
      this.insuranceService.recommend(route.activityTypes),
      this.transfersService.getOptions('PKC_airport', route.zone),
    ]);

    return {
      route,
      flights: flights.slice(0, 5), // топ 5
      hotels: hotels.slice(0, 5),
      insurance,
      transfers,
      extras: [],
    };
  }
}
```

---

## Интеграция в UI

### RouteDetailClient
```tsx
// До:
<RouteAffiliateBlock activityType={route.activityType} />

// После:
<RouteEnrichmentBlock enrichedData={enrichedData} loading={enrichLoading} />
```

### Блоки данных
- **EnrichedFlightsBlock** — "Как добраться на Камчатку"
- **EnrichedHotelsBlock** — "Где остановиться"
- **EnrichedInsuranceBlock** — "Страховка" (контекстно, если активность требует)
- **EnrichedTransfersBlock** — "Трансфер на маршрут"
- **EnrichedExtrasBlock** — "Комбо и дополнения"

---

## API Endpoints Required

### Aviasales Search API
**Статус:** Требует заявки
**URL:** `https://api.travelpayouts.com/`
**Параметры:** origin, destination, depart_date, return_date, market, currency
**Auth:** apiToken (из личного кабинета)
**Rate:** 1 запрос в секунду

### Hotellook
**Статус:** Deeplinks (нет открытого API)
**Pattern:** `https://hotellook.com/...?marker=402896`

### Cherehapa
**Статус:** Есть API
**Docs:** support.cherehapa.ru
**Auth:** API ключ

### Kiwitaxi
**Статус:** Есть JSON-рейт
**URL:** `https://kiwitaxi.ru/api/`
**Auth:** apiKey

---

## Кэширование

- **Рейсы:** 24ч (цены меняются)
- **Отели:** 6ч
- **Страховка:** 7 дней (не меняется)
- **Трансферы:** 12ч

Кэш в Redis ключи: `enrichment:flights:{from}:{to}:{date}`, etc.

---

## Приоритет

1. **Phase 1:** Insurance (простая логика, высокий ROI)
2. **Phase 2:** Transfers (Kiwitaxi API простой)
3. **Phase 3:** Hotels (deeplinks, видимая ценность)
4. **Phase 4:** Flights (требует заявки на Aviasales)

---

## Ожидаемый результат

**До:** "Оставить заявку" → форма → ждём звонка
**После:** "Вот полный план: рейс ₽15k + отель ₽8k + страховка ₽1.2k + трансфер ₽2.5k" → букинг → либо напрямую, либо заявка с контекстом
