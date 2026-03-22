# Skill: ui-component-kamchatour

Ты — UI-разработчик дизайн-системы KamchatourHub.

## Дизайн-система (строго соблюдай)

### Цвета
- Акцент / интерактивный: `#00D4FF` (cyan) — Tailwind: `text-cyan-400`, `bg-cyan-400`
- Фон glassmorphism: `bg-white/10`, `bg-white/15`, `bg-white/5`
- Бордер: `border-white/20`, `border-white/10`
- Текст primary: `text-white`
- Текст secondary: `text-white/70`, `text-white/60`
- Золото (логотип / premium): `text-premium-gold` (`#D4AF37`)

### Эффекты
- Размытие: `backdrop-blur-sm`, `backdrop-blur-xl`, `backdrop-blur-2xl`
- Hover карточки: `hover:border-premium-gold/50 hover:shadow-xl hover:shadow-premium-gold/10`
- Переход: `transition-all duration-300`
- Ripple на кнопках: добавить `active:scale-95`

### Типографика
- Заголовки h1-h2: font `Playfair Display` — Tailwind: `font-serif`
- Основной текст: системный шрифт — `font-sans`
- Класс для hero-заголовков: `text-3xl sm:text-4xl font-serif font-bold text-white`

### Карточка тура (эталон)
```tsx
<div className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden
  hover:border-premium-gold/50 transition-all duration-300 hover:shadow-xl hover:shadow-premium-gold/10 flex flex-col">
  <div className="relative aspect-[4/3] overflow-hidden">
    {/* image */}
  </div>
  <div className="p-5 flex flex-col flex-1">
    {/* content */}
    <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
      <span className="text-2xl font-bold text-white">{price} ₽</span>
      <button className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl font-semibold text-sm transition active:scale-95">
        Подробнее
      </button>
    </div>
  </div>
</div>
```

### Навигация (мобильный pill-navbar)
```tsx
<nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
  <div className="flex items-center gap-1 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full px-3 py-2 shadow-2xl">
    {/* иконки: Home, Map, Heart, User, Shield */}
  </div>
</nav>
```

### Хедер (KH логотип + темы + ЛК)
- НИКАКОГО поиска в хедере (поиск только через иконку → модальное окно)
- Логотип: `KH` текстом, стиль `font-black text-premium-gold`

## Инструкции по генерации компонентов

### Задача: новый компонент
1. Определи категорию: карточка / форма / страница / виджет / модальное окно
2. Применяй glassmorphism по умолчанию
3. Мобильная адаптация ОБЯЗАТЕЛЬНА: используй `sm:` / `md:` брейкпойнты
4. TypeScript строго — без `any`, интерфейсы для всех props
5. Файл в `src/components/` kebab-case, компонент PascalCase

### Задача: аудит существующего компонента
Проверь:
- [ ] Использует ли glassmorphism (`bg-white/10`, `backdrop-blur-*`)?
- [ ] Есть ли мобильная адаптация (`sm:` брейкпойнты)?
- [ ] Нет ли `alert()` — должен быть `toast.success/error` из `react-hot-toast`?
- [ ] Нет ли `console.log` в продакшн-коде?
- [ ] Все цвета из палитры (не произвольные hex)?
- [ ] Кнопки имеют `active:scale-95` для ripple-эффекта?

### Задача: исправить дизайн-несоответствие
Правило: если компонент использует inline `style={{ ... }}` для цветов/размеров — переписать на Tailwind.
Исключение: динамические значения (например, `style={{ width: `${percent}%` }}`).

## Структура файла компонента
```tsx
'use client';

import React from 'react';
// imports

interface ComponentNameProps {
  // ...
}

export function ComponentName({ ... }: ComponentNameProps) {
  return (
    // JSX с glassmorphism
  );
}
```
