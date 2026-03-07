# Правила схемы данных для туров

> **Создано:** 2026-03-07  
> **Статус:** Активные правила для всех туров  
> **Источник:** `/types/tours.ts`

## Обзор

Единая структура данных для туров используется:
- ✅ Парсерами (idilesom, fishingkam и другие)
- ✅ Ручным вводом (операторы через админку)
- ✅ API валидацией
- ✅ База знаний AI-агентов

## Обязательные поля

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `name` | string | Название тура (макс 255 символов) | "Восхождение на Авачинский вулкан" |
| `description` | string | Полное описание | "Треккинг к вершине..." |
| `difficulty` | enum | Сложность: `easy`, `medium`, `hard` | `"medium"` |
| `duration` | number | Длительность в **часах** | `24` (1 день) |
| `price` | number | Цена в рублях (без копеек) | `15000` |

## Difficulty (Сложность)

### Допустимые значения

**В БД принимаются ТОЛЬКО 3 уровня:**

```typescript
'easy'   // Лёгкий
'medium' // Средний  
'hard'   // Сложный
```

### Маппинг из других форматов

При парсинге автоматически конвертируется:

| Входное значение | → | Конвертируется в |
|------------------|---|------------------|
| Лёгкий, Легкий, Very Easy | → | `easy` |
| Средний, Moderate | → | `medium` |
| Сложный, Hard | → | `hard` |
| **Очень сложный, Very Hard, Экстремальный** | → | **`hard`** |

⚠️ **Важно:** Четвертый уровень (`very_hard`) НЕ поддерживается схемой БД. Все "очень сложные" и "экстремальные" туры мапятся на `hard`.

### Использование в коде

```javascript
// Импорт схемы
const { normalizeDifficulty } = require('../types/tours');

// Нормализация
const difficulty = normalizeDifficulty('Очень сложный'); // → 'hard'
```

## Category (Категория)

### Допустимые значения

```typescript
'volcanoes'   // Вулканы
'fishing'     // Рыбалка
'thermal'     // Термы / горячие источники
'mountains'   // Горы
'geysers'     // Гейзеры
'rivers'      // Реки
'lakes'       // Озёра
'eco'         // Эко-туры
'adventure'   // Приключения (по умолчанию)
'combo'       // Комбо-туры
'snowmobile'  // Снегоходы
'jeep'        // Джип-туры
'wildlife'    // Дикая природа
'cultural'    // Культурные
```

### Маппинг

```typescript
const { normalizeCategory } = require('../types/tours');

normalizeCategory('Рыбалка');    // → 'fishing'
normalizeCategory('Hot Springs');// → 'thermal'
normalizeCategory('???');        // → 'adventure' (fallback)
```

## Duration (Длительность)

**Формат:** Целое число (INTEGER) в **часах**

### Примеры

| Описание | Часов | Формат БД |
|----------|-------|-----------|
| Полдня рыбалки | 4 | `4` |
| Однодневный тур | 24 | `24` |
| 2 дня / 1 ночь | 48 | `48` |
| 3 дня / 2 ночи | 72 | `72` |
| Недельный тур | 168 | `168` |

⚠️ **Не поддерживается:** Дробные значения (0.5, 1.5). Если тур занимает полдня — указывайте часы (4, 6, 8).

## Price (Цена)

**Формат:** INTEGER (без копеек)

```javascript
price: 15000  // ✅ Правильно: 15,000₽
price: 15000.50 // ❌ Неправильно (дробные не поддерживаются)
```

### Диапазоны

| Категория | Диапазон |
|-----------|----------|
| Эконом | 1,000 - 10,000₽ |
| Стандарт | 10,000 - 50,000₽ |
| Премиум | 50,000 - 200,000₽ |
| VIP | 200,000+₽ |

**Валюта:** По умолчанию `RUB` (рубли). USD/EUR поддерживаются но не используются.

## Season (Сезон)

**Формат:** Массив JSONB

```javascript
season: ["summer"]                    // Только лето
season: ["summer", "autumn"]          // Лето и осень
season: ["all_year"]                  // Круглогодично
```

### Допустимые значения

```typescript
'winter'   // Декабрь-Февраль
'spring'   // Март-Май
'summer'   // Июнь-Август
'autumn'   // Сентябрь-Ноябрь
'all_year' // Весь год
```

## Coordinates (Координаты)

**Формат:** Массив точек JSONB

```javascript
coordinates: [
  {
    lat: 53.2553,
    lng: 158.6518,
    name: "Авачинская Сопка",
    address: "Камчатский край"
  },
  {
    lat: 53.1800,
    lng: 158.3800,
    name: "Налычево"
  }
]
```

⚠️ Координаты опциональны. Если неизвестны — оставляйте `null`.

## Group Size (Размер группы)

```javascript
max_group_size: 20  // По умолчанию
min_group_size: 1   // По умолчанию
```

### Типичные размеры по категориям

| Категория | Min | Max |
|-----------|-----|-----|
| Рыбалка | 1-2 | 4-8 |
| Горы / Вулканы | 4 | 10-15 |
| Джип-туры | 4 | 6 |
| Хели-туры | 1 | 2-4 |
| Групповые экскурсии | 10 | 30+ |

## Полный пример

### Минимальный валидный тур

```javascript
{
  name: "Рыбалка на реке Быстрая",
  description: "Однодневная рыбалка на форель и хариуса",
  difficulty: "medium",
  duration: 8,
  price: 12000
}
```

### Полный тур

```javascript
{
  name: "Восхождение на Авачинский вулкан",
  description: "Треккинг к вершине действующего вулкана...",
  short_description: "Восхождение на вулкан за 1 день",
  difficulty: "hard",
  duration: 12,
  price: 18000,
  currency: "RUB",
  category: "volcanoes",
  season: ["summer", "autumn"],
  coordinates: [
    { lat: 53.2553, lng: 158.6518, name: "Авачинская Сопка" }
  ],
  max_group_size: 10,
  min_group_size: 4,
  requirements: [
    "Медицинская справка",
    "Треккинговая обувь",
    "Физическая подготовка"
  ],
  included: [
    "Трансфер из Петропавловска",
    "Гид-инструктор",
    "Страховка"
  ],
  not_included: [
    "Питание",
    "Личное снаряжение"
  ],
  is_active: true
}
```

## Используемые скрипты

### Парсинг Tilda API (fishingkam)

```bash
node scripts/parse-fishingkam-tilda.js
```

Результат: `fishingkam-tours.json`

### Импорт в БД

```bash
node scripts/import-fishingkam-to-db.js  # Из JSON
node scripts/load-fishingkam-tours.js    # Напрямую 11 туров
```

## Валидация

### В TypeScript

```typescript
import { validateMinimalTour, normalizeParsedTour } from '@/types/tours';

const parsed = { /* данные из парсера */ };
const normalized = normalizeParsedTour(parsed);

if (validateMinimalTour(normalized)) {
  // Валидный тур, можно вставлять в БД
}
```

### В Node.js (скрипты)

```javascript
const { normalizeDifficulty, normalizeCategory } = require('../types/tours');

const difficulty = normalizeDifficulty(rawData.difficulty);
const category = normalizeCategory(rawData.category);
```

## Checklist для новых туров

- [ ] `name` не пустое (макс 255 символов)
- [ ] `description` не пустое
- [ ] `difficulty` только: `easy`, `medium`, `hard`
- [ ] `duration` целое число > 0 (в часах)
- [ ] `price` целое число >= 0 (в рублях)
- [ ] `category` из списка допустимых
- [ ] `season` массив (не пустой)
- [ ] `coordinates` валидный JSONB или null
- [ ] `max_group_size` >= `min_group_size`

## Ошибки и решения

### ❌ `tours_difficulty_check violation`

**Причина:** Используется недопустимое значение (например `very_hard`)

**Решение:**
```javascript
// ❌ Неправильно
difficulty: 'very_hard'

// ✅ Правильно
const { normalizeDifficulty } = require('../types/tours');
difficulty: normalizeDifficulty('very_hard') // → 'hard'
```

### ❌ `password authentication failed`

**Причина:** Хардкод credentials вместо DATABASE_URL

**Решение:**
```javascript
// ❌ Неправильно
const client = new Client({
  host: '...', user: '...', password: '...'
});

// ✅ Правильно
require('dotenv').config({ path: '.env.local' });
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
```

---

## История изменений

- **2026-03-07:** Создание файла. Фиксация правил `difficulty` (3 уровня).
- **2026-03-07:** Загружено 11 туров от "Камчатская Рыбалка" по новым правилам.

## Статус в БД

**Текущее состояние:**

```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy,
  COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium,
  COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard
FROM tours;
```

| Всего | Easy | Medium | Hard |
|-------|------|--------|------|
| 11 | 4 | 3 | 4 |

**Источник:** Камчатская Рыбалка (fishingkam.ru)  
**Загружено:** 2026-03-07
