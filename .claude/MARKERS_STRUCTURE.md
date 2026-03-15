# Структура маркеров на картах

## Типы маркеров

Маркеры на картах структурированы по видам (типам) для лучшей визуализации и управления:

### MarkerType enum

```typescript
export enum MarkerType {
  TOUR = 'tour',           // Туры и маршруты
  TRANSFER = 'transfer',   // Трансферы и транспорт
  ACCOMMODATION = 'accommodation', // Размещение (отели, базы)
  RESTAURANT = 'restaurant',       // Рестораны, кафе
  POI = 'poi',             // Достопримечательности, офисы
}
```

## Визуальные иконки по типам

| Тип | Иконка | Использование | Цвет (примеры) |
|-----|--------|---------------|---|
| **TOUR** | 🔵 Кружок | Маршруты, активности | По категории (синий, коричневый, оранжевый) |
| **TRANSFER** | ◼ Квадрат | Трансферы, такси, прокат | Зелёный, серый |
| **ACCOMMODATION** | ◆ Ромб | Отели, гестхаусы, базы | Оранжевый |
| **RESTAURANT** | ✚ Крест | Кафе, рестораны | Красный |
| **POI** | ★ Звезда | Офисы, достопримечательности | Фиолетовый, серый |

## MapMarker interface

```typescript
export interface MapMarker {
  coords: [number, number];      // [lat, lng]
  title: string;                 // Название точки
  description?: string;          // Подпись (категория, адрес и т.д.)
  color?: string;                // Цвет из COLOR_HEX (синий, оранжевый и т.д.)
  href?: string;                 // URL для клика (попап)
  type?: MarkerType;             // Тип маркера
  category?: string;             // Категория маршрута (для туров)
}
```

## Цвета (COLOR_HEX)

```typescript
const COLOR_HEX: Record<string, string> = {
  red:        '#DC2626',    // Красный
  blue:       '#2568B0',    // Синий (основной)
  green:      '#3FB950',    // Зелёный
  orange:     '#D44A0C',    // Оранжевый (акцент)
  purple:     '#8B5CF6',    // Фиолетовый
  darkBlue:   '#1E40AF',    // Тёмный синий
  darkCyan:   '#0891B2',    // Тёмный голубой
  lightBlue:  '#38BDF8',    // Светлый голубой
  darkGreen:  '#15803D',    // Тёмный зелёный
  teal:       '#0D9488',    // Бирюзовый
  brown:      '#92400E',    // Коричневый
  gray:       '#6B7280',    // Серый
  darkOrange: '#C2410C',    // Тёмный оранжевый
  cyan:       '#06B6D4',    // Голубой
};
```

## Категории маршрутов (туры)

Для туров используется `MarkerType.TOUR` со следующими категориями:

```typescript
const CATEGORY_COLORS: Record<string, string> = {
  vulkani:              'orange',    // Вулканы
  rybalka:              'blue',      // Рыбалка
  termalnye_istochniki: 'red',       // Термальные источники
  geyzery:              'green',     // Гейзеры
  morskie_progulki:     'darkCyan',  // Морские прогулки
  trekking:             'darkGreen', // Трекинг
  vertoletnye_tury:     'purple',    // Вертолётные туры
  medvedi:              'brown',     // Медведи
  snegohod:             'cyan',      // Снегоходы
  dzhip:                'gray',      // Джип-туры
  lakes:                'lightBlue', // Озёра
  mountains:            'darkBlue',  // Горы
  rivers:               'teal',      // Реки
  eco:                  'green',     // Экомаршруты
};
```

## Примеры использования

### Маршрут на карте (TOUR)
```typescript
{
  coords: [53.0444, 158.6483],
  title: 'Авачинский вулкан',
  description: 'Вулканы',
  color: 'orange',
  href: '/routes/abc123',
  type: MarkerType.TOUR,
  category: 'vulkani',
}
```

### Трансфер на карте (TRANSFER)
```typescript
{
  coords: [53.1234, 158.5678],
  title: 'Трансфер из аэропорта',
  description: 'Петропавловск - Апача',
  color: 'green',
  href: '/transfer/xyz789',
  type: MarkerType.TRANSFER,
}
```

### Офис оператора (POI)
```typescript
{
  coords: [53.1838, 158.3804],
  title: 'Камчатинтур - офис',
  description: 'ул. Спортивная, 10',
  color: 'purple',
  type: MarkerType.POI,
}
```

## Тестирование

На странице `/test/markers` можно видеть все типы маркеров вместе с их иконками и цветами.

## Где используются маркеры

1. **`/map`** — карта Камчатки со всеми маршрутами (TOUR)
2. **`/routes`** — каталог с встроенной картой (TOUR)
3. **`/routes/[id]`** — страница маршрута (TOUR)
4. **`/operators/[slug]`** — профиль оператора (POI для офиса и локации)
5. **`/test/markers`** — демонстрация всех типов

## Когда добавить новые типы маркеров

1. **Трансферы в системе** → используйте `TRANSFER`
2. **Размещение (отели, базы)** → используйте `ACCOMMODATION`
3. **Рестораны, кафе** → используйте `RESTAURANT`
4. **Новые POI** → используйте `POI`

Всегда передавайте `type` при создании маркеров для консистентной визуализации.
