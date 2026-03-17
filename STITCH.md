# Stitch SDK Integration для KamchatourHub

> AI-генерация Tailwind компонентов через Google Stitch SDK с соблюдением дизайн-системы проекта

## Что это даёт

**Google Stitch SDK** — программный доступ к Google Stitch для генерации UI компонентов.

**Ключевые возможности:**
1. Описываешь экран словами → получаешь готовый Tailwind-код
2. Редактируешь через промпты без ручной вёрстки
3. Экспортируешь в React/JSX/HTML
4. Автоматически применяется дизайн-система из `DESIGN.md`
5. MCP Server интеграция для Claude Code / Gemini CLI

**Квоты:**
- Standard: 350 генераций/месяц (бесплатно)
- Experimental (Gemini 2.5 Pro): 50/месяц

---

## Быстрый старт

### 1. Получите API ключ

1. Перейдите на https://stitch.withgoogle.com
2. Создайте проект или используйте существующий
3. Получите `STITCH_API_KEY` и `STITCH_PROJECT_ID`

### 2. Настройте переменные окружения

Добавьте в `.env.local`:

```bash
STITCH_API_KEY=your_api_key_here
STITCH_PROJECT_ID=your_project_id_here
```

### 3. Генерируйте компоненты

```bash
# Генерация произвольного экрана
npm run stitch:generate -- "Страница бронирования с календарём и формой оплаты"

# Генерация готовых экранов платформы
npm run stitch:generate-screens -- --screen=homepage
npm run stitch:generate-screens -- --screen=tour-detail
npm run stitch:generate-screens -- --screen=booking
npm run stitch:generate-screens -- --all

# Редактирование экрана
npm run stitch:edit -- <screen-id> "Добавь боковую панель с погодой"

# Экспорт в компонент
npm run stitch:export -- <screen-id> --output components/booking/BookingPage.tsx
```

---

## Дизайн-система

Все генерации автоматически используют контекст из `DESIGN.md`:

- **Цвета:** CSS-переменные `var(--accent)`, `var(--ocean)`, `var(--bg-card)` и т.д.
- **Типографика:** Playfair Display (заголовки), Outfit (текст)
- **Иконки:** Только `lucide-react`
- **Стиль:** Премиальный, природный (Камчатка)
- **Адаптивность:** Mobile-first
- **Touch targets:** Минимум 44x44px

**Запрещено:**
- Glassmorphism (`bg-white/10`, `backdrop-blur-*`)
- Hardcoded hex цвета
- Emoji (только иконки)

---

## Примеры использования

### Генерация страницы тура

```bash
npm run stitch:generate -- "Страница детальной информации о туре. Включить: галерею фото, описание, программу по дням, карточку бронирования, отзывы. Playfair Display для заголовков, Outfit для текста. CSS-переменные: var(--accent) #D44A0C, var(--ocean) #2568B0. lucide-react иконки: MapPin, Clock, Users, Star. Премиальный стиль, природные мотивы Камчатки."
```

**Результат:**
- Screen ID: `abc123xyz`
- Временный файл: `.stitch-temp/abc123xyz.tsx`

### Редактирование экрана

```bash
npm run stitch:edit -- abc123xyz "Добавь sidebar справа с виджетом погоды и контактами оператора"
```

### Экспорт в компонент

```bash
npm run stitch:export -- abc123xyz --output components/tours/TourDetailPage.tsx
```

**Компонент готов к использованию:**
```tsx
// components/tours/TourDetailPage.tsx
'use client';

import { MapPin, Clock, Users, Star } from 'lucide-react';
// ... остальной код
```

---

## Готовые экраны

Команда `npm run stitch:generate-screens` генерирует основные экраны платформы:

| Экран | Команда | Описание |
|-------|---------|----------|
| `homepage` | `--screen=homepage` | Главная страница с Hero, поиском, турами |
| `tour-detail` | `--screen=tour-detail` | Детальная страница тура с галереей |
| `booking` | `--screen=booking` | Форма бронирования с календарём |
| `tour-card` | `--screen=tour-card` | Переиспользуемый компонент карточки |
| `operator-dashboard` | `--screen=operator-dashboard` | CRM дашборд туроператора |

**Генерация всех:**
```bash
npm run stitch:generate-screens -- --all
```

---

## MCP Server интеграция

Stitch MCP Server настроен в `.cursor/mcp.json` для использования из Claude Code / Gemini CLI.

**Конфигурация:**
```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "@google/stitch-skills"],
      "env": {
        "STITCH_API_KEY": "${STITCH_API_KEY}",
        "STITCH_PROJECT_ID": "${STITCH_PROJECT_ID}"
      }
    }
  }
}
```

**Использование в Claude Code:**
```
Claude, используя Stitch SDK сгенерируй страницу отзывов с карточками отзывов и формой добавления. Следуй дизайн-системе из DESIGN.md.
```

---

## Workflow

### 1. Генерация

```bash
npm run stitch:generate -- "Ваш промпт здесь"
```

**Выдаёт:**
- Screen ID
- Временный файл в `.stitch-temp/`
- URL для предпросмотра (опционально)

### 2. Итерация

```bash
npm run stitch:edit -- <screen-id> "Измени цвет кнопки на accent"
npm run stitch:edit -- <screen-id> "Добавь секцию FAQ"
npm run stitch:edit -- <screen-id> "Сделай header sticky"
```

### 3. Экспорт

```bash
npm run stitch:export -- <screen-id> --output components/path/Component.tsx
```

### 4. Проверка и интеграция

```bash
# Проверка типов
npm run type-check

# Линтинг
npm run lint

# Тестирование
npm run dev
```

---

## Структура файлов

```
kamhub/
├── DESIGN.md                          # Дизайн-система (источник контекста)
├── STITCH.md                          # Эта документация
├── .env.local.example                 # Пример переменных окружения
├── .cursor/mcp.json                   # MCP Server конфигурация
├── scripts/
│   ├── stitch-generate.ts             # Основной скрипт генерации
│   └── stitch-generate-screens.ts     # Генератор готовых экранов
├── .stitch-temp/                      # Временные файлы (не в git)
└── components/
    └── generated/                     # Экспортированные компоненты
```

---

## TypeScript API

```typescript
import { generateScreen, editScreen, exportScreen } from './scripts/stitch-generate';

// Генерация
const screenId = await generateScreen({
  prompt: 'Страница с картой маршрутов',
  includeDesignSystem: true,
});

// Редактирование
await editScreen({
  screenId: 'abc123',
  editPrompt: 'Добавь фильтры по категориям',
});

// Экспорт
await exportScreen({
  screenId: 'abc123',
  outputPath: 'components/routes/RoutesMapPage.tsx',
});
```

---

## Советы по промптам

### Хороший промпт

```
Создай страницу бронирования тура с календарём и формой оплаты.

Лейаут: 2 колонки (форма слева 66%, итого справа 33%).

Форма включает:
- Выбор даты (календарь с доступными/занятыми днями)
- Данные гостей (Имя, Email, Телефон)
- Количество человек (select 1-10)
- Доп услуги (чекбоксы: Трансфер, Снаряжение, Страховка)
- Кнопка "Оплатить" (accent цвет)

Итого включает:
- Детали тура (название, даты)
- Расчёт стоимости
- Итоговая сумма (крупно)
- Политика отмены

Используй:
- CSS vars: var(--accent), var(--success), var(--bg-card)
- Playfair Display для заголовков
- lucide-react: Calendar, Shield, Lock
- Mobile-first (grid-cols-1 lg:grid-cols-3)
- Валидация форм (красные границы)

Стиль: Доверие + безопасность, Камчатка контекст.
```

### Плохой промпт

```
Сделай красивую страницу бронирования
```

**Разница:**
- ✅ Конкретика (что именно включить)
- ✅ Лейаут (структура)
- ✅ Дизайн-токены (CSS vars)
- ✅ Иконки (lucide-react)
- ✅ Адаптивность (breakpoints)
- ❌ Абстрактность ("красивую")

---

## Ограничения

1. **Квоты:** 350 генераций/мес (Standard), 50/мес (Experimental)
2. **Сложность:** Генерация работает лучше для отдельных экранов, чем для всего приложения
3. **Постобработка:** Может потребоваться ручная доработка (импорты, типы)
4. **Стили:** Использует Tailwind CSS (inline), не CSS Modules

---

## Troubleshooting

### Ошибка: `STITCH_API_KEY не установлен`

**Решение:**
```bash
# Добавьте в .env.local
STITCH_API_KEY=your_key_here
STITCH_PROJECT_ID=your_project_id
```

### Ошибка: `Screen not found`

**Решение:**
- Проверьте Screen ID
- Убедитесь что временный файл существует: `ls .stitch-temp/`

### Генерация не следует дизайн-системе

**Решение:**
1. Проверьте `DESIGN.md` актуален
2. Добавьте больше контекста в промпт
3. Используйте `includeDesignSystem: true` (по умолчанию)

### TypeScript ошибки после экспорта

**Решение:**
```bash
# Проверка
npm run type-check

# Возможно нужно добавить импорты
import type { FC } from 'react';
import Link from 'next/link';
```

---

## Roadmap

- [ ] Автоматическая генерация тестов для экранов
- [ ] Интеграция с Figma (импорт дизайнов)
- [ ] Поддержка темизации (light/dark auto-switch)
- [ ] Библиотека готовых промптов
- [ ] CI/CD: генерация компонентов в пайплайне

---

## Ссылки

- **Stitch SDK:** https://stitch.withgoogle.com
- **Документация:** https://github.com/google/stitch-sdk
- **MCP Skills:** https://github.com/google/stitch-skills
- **DESIGN.md:** Дизайн-система KamchatourHub

---

**Версия:** 1.0
**Обновлено:** Март 2026
**Статус:** Production-ready
