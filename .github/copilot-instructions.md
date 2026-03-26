# Kamhub - Copilot Instructions

## О проекте
TourHab — AI-first туристическая платформа Камчатки. Next.js 15, TypeScript strict, Tailwind CSS, PostgreSQL.
Продакшен: https://tourhab.ru

## Команды
```bash
npm run dev      # Dev сервер (порт 3000)
npm run build    # Сборка
npx tsc --noEmit # Проверка типов (0 ошибок)
npm test         # Тесты (vitest)
npm run lint     # Линтинг
```

## Дизайн-система

Все стили через CSS-переменные. Glassmorphism (bg-white/10, backdrop-blur) полностью заменен на CSS vars.

### Цветовые токены
```css
/* Light (default) */
--bg-primary: #F5F0EB;    --bg-card: #FFFFFF;
--text-primary: #1A1714;   --text-muted: #9A9590;
--accent: #D44A0C;         --ocean: #2568B0;

/* Dark */
--bg-primary: #0D1117;    --bg-card: #21262D;
--text-primary: #F0F6FC;   --text-muted: #484F58;
--accent: #E8734A;         --ocean: #00A8CC;
```

### Утилитарные классы (ds-*)
`ds-page`, `ds-card`, `ds-input`, `ds-btn`, `ds-btn-primary`, `ds-section`, `ds-badge`, `ds-h1`, `ds-h2`

### Типографика
- Заголовки: Playfair Display (`--font-playfair`)
- Основной текст: Outfit (`--font-outfit`)

### Запрещено
- `bg-white/10`, `text-white`, `backdrop-blur-*` — используй `bg-[var(--bg-card)]`, `text-[var(--text-primary)]`
- `text-cyber-cyan`, `text-premium-gold` — используй `text-[var(--accent)]`
- `font-black` — используй `font-bold`
- Хардкод hex — только CSS vars

## React Best Practices

### 1. Server/Client split
```tsx
// page.tsx (server component)
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Страница' }
import PageClient from './_PageClient'
export default function Page() { return <PageClient /> }

// _PageClient.tsx
'use client'
export default function PageClient() { /* вся логика */ }
```

### 2. useEffect
- Избегать лишних useEffect
- Derived state для вычисляемых значений
- Только для side effects (API, subscriptions)

### 3. Data fetching
```tsx
import useSWR from 'swr'
const fetcher = (url: string) => fetch(url).then(r => r.json())
const { data } = useSWR('/api/weather', fetcher, { refreshInterval: 600000 })
```

### 4. Accessibility
- `aria-label` на кнопках/инпутах
- Семантический HTML
- Keyboard navigation
- Alt text на изображениях

### 5. Performance
- `React.memo` для дорогих компонентов
- `useMemo` для вычислений
- `useCallback` для передаваемых функций

### 6. No Emojis
**НИКАКИХ ЭМОДЗИ** в коде, UI, console.log. Заменять на Lucide React иконки или текст.

## Ключевые файлы
- `lib/database.ts` — PostgreSQL query wrapper
- `lib/db-pool.ts` — `{ pool }` (NAMED export)
- `lib/auth/middleware.ts` — requireAuth, requireAdmin, requireRole
- `lib/types/db-rows.ts` — интерфейсы строк БД
- `lib/services/` — бизнес-логика (tour, booking, payment, rag, messaging)
- `lib/ai/providers.ts` — AI waterfall (8 провайдеров)
- `lib/ai/provider-config.ts` — ключи и конфигурация провайдеров
- `lib/services/lead-processor.service.ts` — AI Lead Processor (квалификация лидов)
- `lib/pdf/proposal-generator.ts` — PDF-предложения (PDFKit)
- `lib/notifications/lead-notify.ts` — Telegram-нотификации о лидах

## Timeweb MCP
Конфигурация в `.vscode/mcp.json` (не в git). Управление деплоем через Copilot.
