# KamchatourHub — Volcano OS

**Туристическая платформа Камчатки. Хранитель Камчатки — Кузьмич.**

Мобильная операционная система для туриста: офлайн-карта, безопасность маршрутов, AI-ассистент с ительменскими знаниями и реалтайм-алертами КБГС РАН.

---

## Масштаб (май 2026)

| | |
|---|---|
| Страниц | 94 |
| API routes | 256 |
| UI компонентов | 119 |
| SQL миграций | 669 |
| Мест (places) | 779 |
| Маршрутов | 294 |

---

## Стек

```
Next.js 15 App Router + TypeScript strict
PostgreSQL — raw SQL, без ORM
JWT auth + role-based middleware
AI waterfall: DeepSeek → MiMo → Gemini → OpenRouter → Anthropic
Telegram Bot API (Kuzmich + операторы + MAX)
Timeweb Cloud Docker — Fair Polydeuces app
```

---

## Ключевые модули

```
lib/kuzmich/core.ts           — мозг Кузьмича (Хранитель Камчатки)
lib/kuzmich/guardian-context.ts — safety-first контекст места
lib/agents/tools/taaft-search.ts — каталог внешних AI-инструментов
lib/agents/evo/evolver-analysis.ts — Agent Evolver (петля обратной связи)
lib/payments/binance-client.ts — мониторинг USDT-депозитов
migrations/                    — 669 SQL миграций, применяются авто при деплое
```

---

## AI-агенты

| Агент | Расписание | Роль |
|---|---|---|
| **Kuzmich** | realtime | Хранитель Камчатки. Telegram, MAX, Web, Widget |
| **Watchdog** | каждые 30 мин | Зависшие бронирования, медленные операторы |
| **Editor** | 02:00 UTC | AI-enrichment описаний маршрутов |
| **Scout Digest** | 07:00 UTC | RSS → AI-синтез → Telegram |
| **Agent Evolver** | раз в сутки | ai_actions_log → анализ → external tools → Telegram |

Подробности: `AGENTS.md`

---

## Деплой

```bash
git push origin main
# → sync-to-tourhabk.yml → tourhabk-ui/pos → Timeweb автодеплой
# → start.js накатывает миграции → сервер запускается
```

**Репо:** `pospkam/PosPkTry` (разработка) → `tourhabk-ui/pos` (прод)  
**Timeweb:** приложение **Fair Polydeuces**

### Локальная разработка

```bash
git clone https://github.com/pospkam/PosPkTry.git
cd PosPkTry
npm install
cp .env.example .env.local   # заполнить переменные
npm run dev
```

```bash
npm run migrate       # применить новые миграции локально
npx tsc --noEmit      # type check (0 ошибок)
npx vitest run        # тесты
```

---

## Дизайн-система

Тёплая, земляная. Без glassmorphism, без cyberpunk.

- **Шрифты**: Playfair Display (заголовки) + Outfit (текст)
- **Акцент**: `#D44A0C` (вулканический оранжевый)
- **Иконки**: lucide-react
- **Правила**: `CLAUDE.md` → раздел 2

---

*Построено для Камчатки. Где вулканы встречаются с океаном.*
