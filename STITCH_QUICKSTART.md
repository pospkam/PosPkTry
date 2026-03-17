# 🎨 Stitch SDK Integration — Quick Start

> AI-генерация Tailwind компонентов для KamchatourHub

## Что это?

**Google Stitch SDK** позволяет генерировать UI компоненты через текстовые промпты, автоматически применяя дизайн-систему проекта.

## Быстрая установка

### 1. Получите API ключ

Перейдите на https://stitch.withgoogle.com и получите:
- `STITCH_API_KEY`
- `STITCH_PROJECT_ID` (создаётся автоматически или используйте существующий)

### 2. Настройте .env.local

```bash
# .env.local
STITCH_API_KEY=your_api_key_here
STITCH_PROJECT_ID=your_project_id_here  # опционально
```

### 3. Генерируйте компоненты

```bash
# Произвольный экран
npm run stitch:generate -- "Страница списка отзывов с формой добавления"

# Готовые экраны
npm run stitch:generate-screens -- --screen=homepage
npm run stitch:generate-screens -- --screen=booking
npm run stitch:generate-screens -- --all

# Редактирование
npm run stitch:edit -- <screen-id> "Добавь боковую панель"

# Экспорт в React компонент
npm run stitch:export -- <screen-id> --output components/MyComponent.tsx
```

## Доступные готовые экраны

| Команда | Описание |
|---------|----------|
| `--screen=homepage` | Главная страница (Hero, поиск, туры) |
| `--screen=tour-detail` | Детальная страница тура |
| `--screen=booking` | Форма бронирования с календарём |
| `--screen=tour-card` | Переиспользуемая карточка тура |
| `--screen=operator-dashboard` | CRM дашборд оператора |
| `--all` | Генерация всех экранов |

## Пример workflow

```bash
# 1. Генерация
npm run stitch:generate -- "Страница отзывов с фильтрами"
# Получите Screen ID: abc123

# 2. Итерация
npm run stitch:edit -- abc123 "Добавь рейтинг звёздами"
npm run stitch:edit -- abc123 "Сделай карточки компактнее"

# 3. Экспорт
npm run stitch:export -- abc123 --output components/reviews/ReviewsPage.tsx

# 4. Проверка
npm run type-check
npm run dev
```

## Дизайн-система

Все генерации **автоматически** используют:

- ✅ CSS-переменные из `globals.css` (var(--accent), var(--ocean), etc.)
- ✅ Playfair Display для заголовков, Outfit для текста
- ✅ lucide-react иконки (только они, никаких emoji)
- ✅ Mobile-first адаптивность
- ✅ Премиальный стиль Камчатки (природные мотивы)

**Запрещено:**
- ❌ Glassmorphism (bg-white/10, backdrop-blur-*)
- ❌ Hardcoded hex цвета
- ❌ Emoji

Полная документация: **[DESIGN.md](./DESIGN.md)**

## MCP Server для Claude Code

Stitch уже настроен в `.cursor/mcp.json`. Использование:

```
Claude, используя Stitch SDK сгенерируй страницу FAQ с аккордеоном.
Следуй дизайн-системе из DESIGN.md.
```

## Документация

- **[DESIGN.md](./DESIGN.md)** — Дизайн-система (токены, компоненты, примеры)
- **[STITCH.md](./STITCH.md)** — Полное руководство по использованию
- **[scripts/stitch-generate.ts](./scripts/stitch-generate.ts)** — Основной скрипт
- **[scripts/stitch-generate-screens.ts](./scripts/stitch-generate-screens.ts)** — Готовые шаблоны

## Квоты

- **Standard:** 350 генераций/месяц (бесплатно)
- **Experimental (Gemini 2.5 Pro):** 50/месяц

## Troubleshooting

**Ошибка: `STITCH_API_KEY не установлен`**
→ Добавьте ключ в `.env.local`

**Screen ID не найден**
→ Проверьте `.stitch-temp/` директорию

**TypeScript ошибки после экспорта**
→ Добавьте недостающие импорты вручную

Подробнее: **[STITCH.md#Troubleshooting](./STITCH.md#troubleshooting)**

---

**Версия:** 1.0
**Статус:** Production-ready
**Обновлено:** Март 2026
