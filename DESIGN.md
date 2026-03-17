# KamchatourHub Design System

> Дизайн-система для Google Stitch SDK генерации

## О проекте

**KamchatourHub** — премиальная туристическая платформа Камчатки.

**Эстетика:** Тёплая, земная, природная (лава, вулканы, тайга). Суровая красота + доверие + профессионализм.

**Не использовать:** Минималистично-белый, cyberpunk, startup-purple, generic travel стили.

---

## Цветовая палитра

### Light Theme (по умолчанию)

**Фоны:**
```
--bg-primary: #F5F0EB      /* Тёплый бежевый — основной фон страниц */
--bg-secondary: #EDE9E3    /* Каменный тон — фон секций */
--bg-card: #FFFFFF         /* Белый — карточки */
--bg-hover: #F0ECE7        /* Светло-бежевый — hover состояния */
```

**Текст:**
```
--text-primary: #1A1714    /* Тёмно-коричневый — заголовки, основной текст */
--text-secondary: #6B6560  /* Приглушённый коричневый — подписи */
--text-muted: #9A9590      /* Серо-коричневый — placeholder, неактивный текст */
```

**Акценты:**
```
--accent: #D44A0C          /* Лава оранжевый — CTA кнопки, активные элементы */
--accent-hover: #B83E0A    /* Тёмная лава — hover для CTA */
--accent-muted: rgba(212,74,12,0.1)  /* Полупрозрачная лава — фоны */

--ocean: #2568B0           /* Глубокий синий — ссылки, иконки, вторичные акценты */
--success: #3FB950         /* Зелёный мох — успех, эко-баллы */
--warning: #D29922         /* Янтарный — предупреждения */
--danger: #DC2626          /* Красный — SOS, ошибки */
```

**Границы и тени:**
```
--border: rgba(0,0,0,0.07)        /* Светлые границы */
--border-strong: rgba(0,0,0,0.12) /* Выраженные границы */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08)
--shadow-md: 0 4px 16px rgba(0,0,0,0.1)
--shadow-lg: 0 8px 32px rgba(0,0,0,0.12)
```

**Радиусы:**
```
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 20px
--radius-xl: 28px
```

### Dark Theme

**Фоны:**
```
--bg-primary: #0D1117      /* Ночь — основной фон */
--bg-secondary: #161B22    /* Камень — фон секций */
--bg-card: #21262D         /* Пепел — карточки */
--bg-hover: #30363D        /* Туман — hover */
```

**Текст:**
```
--text-primary: #F0F6FC    /* Снег — заголовки */
--text-secondary: #8B949E  /* Туман — подписи */
--text-muted: #484F58      /* Дым — placeholder */
```

**Акценты:**
```
--accent: #E8734A          /* Яркая лава (для тёмного фона) */
--ocean: #00A8CC           /* Яркий океан циан */
--danger: #F85149          /* Красный пепел */
```

---

## Типографика

### Шрифты

**Заголовки:** `Playfair Display` (serif)
- Weights: 400, 700
- CSS Variable: `--font-playfair`
- Использовать для: H1, H2, Hero заголовки, цитаты
- Tailwind: `font-playfair`

**Основной текст:** `Outfit` (sans-serif)
- Weights: 300, 400, 500, 600, 700
- CSS Variable: `--font-outfit`
- Использовать для: Body text, UI элементы, кнопки, формы
- Tailwind: `font-sans` (по умолчанию)

### Размеры текста

```
Hero заголовки:     text-5xl lg:text-6xl xl:text-7xl     (48-80px)
H1:                 text-4xl lg:text-5xl                  (36-48px)
H2:                 text-3xl lg:text-4xl                  (30-36px)
H3:                 text-2xl lg:text-3xl                  (24-30px)
Body large:         text-lg                               (18px)
Body:               text-base                             (16px)
Body small:         text-sm                               (14px)
Caption:            text-xs                               (12px)
```

### Жирность (weights)

```
Light:      font-light (300)    — только для больших размеров
Regular:    font-normal (400)   — основной текст
Medium:     font-medium (500)   — подзаголовки
Semi-bold:  font-semibold (600) — важный текст
Bold:       font-bold (700)     — заголовки, CTA
```

**Запрещено:** `font-black` — использовать `font-bold`

---

## Компоненты и утилиты

### DS-классы (готовые утилиты)

```css
ds-page          /* Фон страницы с паддингами */
ds-card          /* Карточка с тенью и border */
ds-input         /* Стилизованный input */
ds-btn           /* Базовая кнопка */
ds-btn-primary   /* Основная CTA кнопка (accent) */
ds-btn-secondary /* Вторичная кнопка (outline) */
ds-btn-danger    /* Опасная кнопка (красная) */
ds-section       /* Секция страницы */
ds-badge         /* Бейдж статуса */
ds-h1, ds-h2     /* Стилизованные заголовки */
ds-label         /* Label для форм */
ds-skeleton      /* Loading skeleton */
```

### Кнопки

**Основная (CTA):**
```html
<button className="bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] rounded-lg px-6 py-3 font-semibold transition-all duration-200">
  Забронировать
</button>
```

**Вторичная (outline):**
```html
<button className="border-2 border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-muted)] rounded-lg px-6 py-3 font-semibold transition-all duration-200">
  Подробнее
</button>
```

**Иконочная кнопка (min touch target 44x44px):**
```html
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors">
  <IconComponent size={20} />
</button>
```

### Карточки

**Стандартная карточка:**
```html
<div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-shadow">
  <!-- Контент -->
</div>
```

**Карточка тура:**
```html
<div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden hover:shadow-[var(--shadow-lg)] transition-shadow">
  <img src="..." className="w-full h-48 object-cover" />
  <div className="p-4">
    <h3 className="font-playfair text-2xl text-[var(--text-primary)] mb-2">Название тура</h3>
    <p className="text-[var(--text-secondary)] mb-4">Описание...</p>
    <div className="flex justify-between items-center">
      <span className="text-[var(--accent)] font-bold text-xl">49,000₽</span>
      <button className="ds-btn-primary">Забронировать</button>
    </div>
  </div>
</div>
```

### Формы

**Input:**
```html
<input
  type="text"
  className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
  placeholder="Введите email..."
/>
```

**Label:**
```html
<label className="block text-[var(--text-primary)] font-medium mb-2">
  Email
</label>
```

**Select:**
```html
<select className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all">
  <option>Опция 1</option>
  <option>Опция 2</option>
</select>
```

### Бейджи

```html
<!-- Статус успеха -->
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--success)]/10 text-[var(--success)]">
  Подтверждено
</span>

<!-- Статус ожидания -->
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--warning)]/10 text-[var(--warning)]">
  Ожидает оплаты
</span>

<!-- Статус ошибки -->
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--danger)]/10 text-[var(--danger)]">
  Отменено
</span>
```

---

## Иконки

**Библиотека:** `lucide-react` — единственный разрешённый источник иконок

**Запрещено:** emoji, custom SVG (без необходимости), icon fonts

**Использование:**
```tsx
import { MapPin, Clock, Users, Star, Heart } from 'lucide-react';

<MapPin size={20} className="text-[var(--accent)]" />
```

**Размеры:**
- Small: 16px
- Default: 20px
- Large: 24px
- Hero: 32px+

---

## Анимации

**Разрешено:**
- Tailwind transitions: `transition-all duration-200`, `transition-colors`, `transition-shadow`
- Subtle hover effects: `hover:scale-105`, `hover:shadow-lg`
- Opacity: `hover:opacity-80`

**Запрещено:**
- Glassmorphism (`backdrop-blur-*`)
- Flashy keyframes
- Сложные @keyframes без необходимости

**Примеры:**
```html
<!-- Плавный переход цвета -->
<div className="transition-colors duration-200 hover:bg-[var(--bg-hover)]">

<!-- Увеличение при наведении -->
<div className="transition-transform duration-200 hover:scale-105">

<!-- Появление снизу -->
<div className="transition-all duration-300 translate-y-4 opacity-0 data-[visible]:translate-y-0 data-[visible]:opacity-100">
```

---

## Лейауты

### Сетки

**Адаптивная сетка туров:**
```html
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- TourCard компоненты -->
</div>
```

**2-колоночный лейаут (контент + sidebar):**
```html
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    <!-- Основной контент -->
  </div>
  <div className="lg:col-span-1">
    <!-- Sidebar -->
  </div>
</div>
```

### Spacing

**Внутренние отступы (padding):**
- Карточки: `p-4` или `p-6`
- Секции: `py-12 px-4` или `py-16 px-6`
- Кнопки: `px-4 py-2` или `px-6 py-3`

**Внешние отступы (margin):**
- Между секциями: `mb-12` или `mb-16`
- Между элементами: `mb-4` или `mb-6`
- Мелкие элементы: `mb-2`

### Container

```html
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Контент с ограничением ширины -->
</div>
```

---

## Адаптивность

### Breakpoints

```
sm:  640px   — Мобильный (горизонтальная ориентация)
md:  768px   — Планшет (вертикальная)
lg:  1024px  — Планшет (горизонтальная) / Малый десктоп
xl:  1280px  — Десктоп
2xl: 1536px  — Большой десктоп
```

### Mobile-first подход

**Всегда начинай с мобильной версии:**
```html
<!-- Плохо (desktop-first) -->
<div className="grid-cols-3 sm:grid-cols-1">

<!-- Хорошо (mobile-first) -->
<div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

### Touch targets

**Минимум 44x44px для касания:**
```html
<button className="min-h-[44px] min-w-[44px] px-4">
  Кнопка
</button>
```

---

## Контекст Камчатки

### Визуальная идентичность

**Образы:**
- Вулканы (огонь, лава, пепел)
- Океан (холодные волны, тихоокеанская мощь)
- Тайга (мох, хвоя, дикая природа)
- Медведи, лосось, северное сияние

**Цветовая ассоциация:**
- Оранжевый/красный = вулканы, лава, активность
- Синий = океан, спокойствие, доверие
- Зелёный = природа, эко-туризм
- Коричневый/бежевый = земля, надёжность

### UX-принципы

1. **Safety-first:** SOS-кнопка доступна всегда
2. **Progressive disclosure:** Информация раскрывается по запросу
3. **Факты вместо маркетинга:** Реальные данные, честные цены
4. **Снижение тревоги:** Спокойная палитра, предсказуемое поведение
5. **Доверие через прозрачность:** Показывать статус бронирования, этапы

---

## Запрещено

**Никогда не использовать:**

1. `bg-white/10`, `backdrop-blur-*` — glassmorphism запрещён
2. `text-white`, `bg-black` — только через CSS-переменные
3. Hardcoded hex colors — только `var(--token-name)`
4. `text-cyber-cyan`, `text-premium-gold` — устаревшие цвета
5. `font-black` — максимум `font-bold`
6. `rounded-2xl`, `rounded-3xl` — максимум `rounded-lg` или CSS var `--radius-*`
7. Emoji в UI — только lucide-react иконки
8. Generic travel imagery — только контекст Камчатки

**Правильно заменять:**
```html
<!-- Плохо -->
<div className="bg-white/10 backdrop-blur-lg text-white">

<!-- Хорошо -->
<div className="bg-[var(--bg-card)] text-[var(--text-primary)]">
```

---

## Примеры компонентов

### Hero секция

```html
<section className="relative bg-[var(--bg-primary)] py-20 px-4">
  <div className="max-w-7xl mx-auto">
    <h1 className="font-playfair text-5xl lg:text-7xl font-bold text-[var(--text-primary)] mb-6">
      Камчатка ждёт
    </h1>
    <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-2xl">
      Дикая природа, вулканы и океан. Безопасные туры с экспертами.
    </p>
    <div className="flex gap-4">
      <button className="ds-btn-primary">
        Найти тур
      </button>
      <button className="ds-btn-secondary">
        Узнать больше
      </button>
    </div>
  </div>
</section>
```

### Форма бронирования

```html
<form className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
  <div>
    <label className="ds-label">Имя</label>
    <input type="text" className="ds-input" placeholder="Введите имя" />
  </div>

  <div>
    <label className="ds-label">Email</label>
    <input type="email" className="ds-input" placeholder="your@email.com" />
  </div>

  <div>
    <label className="ds-label">Количество человек</label>
    <select className="ds-input">
      <option>1</option>
      <option>2</option>
      <option>3+</option>
    </select>
  </div>

  <button type="submit" className="w-full ds-btn-primary">
    Забронировать за 49,000₽
  </button>
</form>
```

---

## Генерация через Stitch SDK

При использовании Stitch SDK всегда указывай:

1. **Цветовая схема:** "Используй CSS-переменные из KamchatourHub: --accent, --ocean, --text-primary, --bg-card"
2. **Типографика:** "Playfair Display для заголовков, Outfit для текста"
3. **Иконки:** "Только lucide-react иконки"
4. **Стиль:** "Премиальный, природный, Камчатский контекст"
5. **Адаптивность:** "Mobile-first, min touch target 44px"

**Пример промпта:**
```
Создай страницу бронирования тура с календарём и формой оплаты.
Используй CSS-переменные KamchatourHub (--accent #D44A0C, --ocean #2568B0, --bg-card #FFFFFF).
Playfair Display для заголовков, Outfit для текста.
Только lucide-react иконки (Calendar, Users, MapPin).
Премиальный стиль, природные мотивы Камчатки.
Mobile-first, адаптивная сетка.
```

---

**Версия:** 1.0
**Обновлено:** Март 2026
**Статус:** Готов к использованию с Stitch SDK
