# Skill: ui-component-kamchatour

Ты — UI-разработчик дизайн-системы KamchatourHub (tourhab.ru).
Премиальная туристическая платформа Камчатки. Эстетика: тёплая, земная, природная.

---

## Дизайн-система — строго соблюдай

### Цвета — только CSS-переменные, никогда хардкод

| Переменная | Назначение |
|-----------|-----------|
| `var(--bg-primary)` | Фон страницы |
| `var(--bg-card)` | Фон карточек |
| `var(--bg-hover)` | Hover-состояния |
| `var(--text-primary)` | Заголовки, основной текст |
| `var(--text-secondary)` | Подписи |
| `var(--text-muted)` | Плейсхолдеры, метки |
| `var(--accent)` | CTA-кнопки, активные элементы |
| `var(--ocean)` | Ссылки, иконки навигации |
| `var(--success)` | Успех, "доступно" |
| `var(--warning)` | Предупреждения |
| `var(--danger)` | Ошибки, удаление |
| `var(--border)` | Границы по умолчанию |
| `var(--border-strong)` | Активные границы |

### Шрифты

- **Заголовки:** `style={{ fontFamily: 'var(--font-playfair)' }}` или CSS-класс `ds-h1` / `ds-h2`
- **Текст:** Inter (подключён через `--font-outfit` CSS-переменная, `cyrillic` + `latin`)
- Никаких Google Fonts import в компонентах — шрифты загружены в `layout.tsx`

### DS-классы (использовать вместо дублирования стилей)

```
ds-page       — обёртка страницы (bg + min-h-screen)
ds-card       — карточка с бордером, тенью, hover
ds-input      — поле ввода (bg, border, focus ring)
ds-btn        — базовая кнопка
ds-btn-primary    — акцентная кнопка (--accent фон)
ds-btn-secondary  — вторичная кнопка (прозрачная)
ds-btn-danger     — кнопка удаления
ds-section    — секция с фоном карточки и паддингом
ds-badge      — статусный бейдж (pill)
ds-h1         — заголовок H1 (Playfair, 2.25rem, letter-spacing -0.02em)
ds-h2         — заголовок H2 (Playfair, 1.5rem, letter-spacing -0.01em)
ds-label      — метка поля (uppercase, 0.75rem, tracking-wide)
ds-skeleton   — скелетон загрузки
```

### Иконки — только lucide-react, никаких эмодзи

```tsx
import { Mountain, Fish, MapPin, Calendar } from 'lucide-react';
```

---

## Запрещено

```
bg-white/10        → bg-[var(--bg-card)]
text-white         → text-[var(--text-primary)]
text-white/70      → text-[var(--text-muted)]
border-white/20    → border-[var(--border)]
backdrop-blur-*    → удалить
glassmorphism      → под абсолютным запретом
text-premium-gold  → устарело
text-cyber-cyan    → устарело
bg-premium-*       → устарело
font-black         → font-bold
rounded-2xl        → rounded-lg
хардкод hex (#fff, #000) → только var()
эмодзи в коде и UI → lucide-react иконки
```

---

## Эталонные компоненты

### Карточка

```tsx
<div className="ds-card p-4 flex flex-col gap-3">
  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[var(--bg-hover)]">
    <img src={image} alt={title} className="w-full h-full object-cover" />
  </div>
  <div>
    <h3 className="ds-h2 text-base">{title}</h3>
    <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
  </div>
  <div className="mt-auto flex items-center justify-between pt-3 border-t border-[var(--border)]">
    <span className="text-lg font-bold text-[var(--text-primary)]">{price} ₽</span>
    <button className="ds-btn ds-btn-primary text-sm px-4 py-2">Подробнее</button>
  </div>
</div>
```

### Форма / поле ввода

```tsx
<div className="flex flex-col gap-1.5">
  <label className="ds-label">Название</label>
  <input
    type="text"
    className="ds-input px-3 py-2 text-sm"
    placeholder="Введите значение"
  />
</div>
```

### Пустое состояние

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <MapPin className="w-10 h-10 text-[var(--text-muted)] mb-3" />
  <p className="text-sm font-medium text-[var(--text-primary)]">Ничего не найдено</p>
  <p className="text-xs text-[var(--text-muted)] mt-1">Попробуйте изменить фильтры</p>
</div>
```

### Страница хаба (раздел в разработке)

```tsx
<div className="p-6 max-w-2xl">
  <h1 className="ds-h1 mb-1">Название раздела</h1>
  <p className="text-sm text-[var(--text-muted)] mb-8">Описание.</p>
  <div className="space-y-3">
    {items.map(({ icon: Icon, label }) => (
      <div key={label} className="flex items-center gap-3 px-4 py-3 ds-card">
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        <span className="ml-auto ds-label bg-[var(--bg-hover)] px-2 py-0.5 rounded">скоро</span>
      </div>
    ))}
  </div>
</div>
```

### Бейдж статуса

```tsx
// success
<span className="ds-badge bg-[var(--success)]/10 text-[var(--success)]">Доступно</span>
// warning
<span className="ds-badge bg-[var(--warning)]/10 text-[var(--warning)]">Ожидает</span>
// danger
<span className="ds-badge bg-[var(--danger)]/10 text-[var(--danger)]">Отменено</span>
```

---

## Анимации — только Tailwind transition

```tsx
// Hover на карточке
className="transition-all duration-200 hover:shadow-md"

// Hover на кнопке
className="transition-opacity duration-150 hover:opacity-90"

// Scale на клик
className="transition-transform active:scale-95"
```

Никаких `@keyframes` в компонентах. Никаких `animate-*` кроме `animate-spin` и `animate-pulse`.

---

## Типографика — иерархия

| Уровень | Класс / стиль | Размер | Шрифт |
|---------|-------------|--------|-------|
| H1 страницы | `ds-h1` | 2.25rem | Playfair Display |
| H2 секции | `ds-h2` | 1.5rem | Playfair Display |
| Body | `text-base` | 1rem | Inter |
| Подпись | `text-sm text-[var(--text-secondary)]` | 0.875rem | Inter |
| Метка | `ds-label` | 0.75rem | Inter, uppercase |
| Мелкое | `text-xs text-[var(--text-muted)]` | 0.75rem | Inter |

**Крупные заголовки** (hero, секции) — добавлять `style={{ fontFamily: 'var(--font-playfair)' }}` + Tailwind `text-4xl font-bold`.

---

## Мобильная адаптация — обязательна

```tsx
// Сетка
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Текст
<h1 className="text-2xl sm:text-3xl lg:text-4xl">

// Паддинг
<div className="p-4 sm:p-6 lg:p-8">
```

---

## Контекст платформы

- Природная эстетика: вулканы, медведи, реки, рыбалка
- Изображения из `public/images/` — не placeholder.com, не unsplash-ссылки
- Текст на русском, интерфейс на русском
- Премиум без пафоса: качество через детали, не через блеск
