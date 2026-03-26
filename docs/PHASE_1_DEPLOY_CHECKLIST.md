# ✅ ЧЕК-ЛИСТ: ВЫКАТКА ФАЗЫ 1 (AI LEAD PROCESSOR VISIBILITY)

**Дата начала:** 26 марта 2026  
**Дата финиша:** 2 апреля 2026 (7 дней)  
**Статус:** 🟢 На выполнение

---

## ПРЕ-ЧЕКИ: БЕЗ НИХ НЕЛЬЗЯ ДЕПЛОИТЬ

- [ ] **npm run lint** → 0 errors
- [ ] **npx tsc --noEmit** → 0 errors  
- [ ] **npm test** → все тесты passing
- [ ] **npm run build** → успешная сборка
- [ ] Миграция 083 применена на проде (`leads`, `lead_proposals` таблицы существуют)
- [ ] Env переменные на Timeweb актуальны (OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN)

---

## КОД И КОМПОНЕНТЫ

### ✅ Phase 1.1: OperatorPromo на главную

- [x] Создан `components/homepage/OperatorPromo.tsx` (300+ строк)
- [x] Добавлен в `app/page.tsx` как lazy-loaded компонент
- [x] Текст на русском, без грамотических ошибок
- [x] 3 feature-карточки видны (AI Квалификация, Умный матч, PDF+Telegram)
- [ ] Протестировано локально на Chrome + Safari
- [ ] Протестировано на iPhone 12 (responsive)
- [ ] Цвета используют CSS vars (var(--accent), var(--bg-card), etc)
- [ ] CTA кнопки кликабельны и ведут: `/auth/register?role=operator` + `/hub/operator/leads`

**Локальный тест:**
```bash
npm run dev
# Открыть http://localhost:3000
# Скроллить вниз → виден "ДЛЯ ТУРОПЕРАТОРОВ" блок
# Нажать "Зарегистрироваться" → попадает в /auth/register
```

### ✅ Phase 1.2: Operator Nav + Лиды пункт

- [x] Добавлена икона `Brain` в импорты lucide-react  
- [x] Добавлен пункт "Лиды" в navItems (`OperatorNav.tsx`)
- [x] Путь: `/hub/operator/leads`
- [ ] При логине как оператор → видна в меню
- [ ] Клик ведёт на `/hub/operator/leads` (страница лидов загружается без ошибок)

**Тест:**
```
1. Залогиниться как оператор
2. Открыть /hub/operator
3. В меню слева видна "Лиды" с иконкой мозга
4. Клик → /hub/operator/leads (пусто, но ОК)
```

### ✅ Phase 1.3: Lead Processor API endpoints (уже готовы)

- [x] `POST /api/leads/process` — запуск AI-обработки
- [x] `GET /api/leads/[id]/proposal` — данные предложения
- [x] `GET /api/leads/[id]/proposal/pdf` — скачать PDF
- [x] `GET /api/leads?status=&limit=50` — список лидов оператора
- [ ] Все endpoints тестированы на реальных лидах (10+ тестовых лидов)
- [ ] PDF генерируется за <20 сек на каждом
- [ ] Ошибки логируются в Sentry (если есть)

---

## ДОКУМЕНТАЦИЯ И ЮРИДИКА

### ✅ Phase 0: Договор и Onboarding

- [x] Создан `docs/OPERATOR_AGREEMENT_TEMPLATE.md` (полный договор)
- [x] Создан `docs/OPERATOR_ONBOARDING.md` (7-этапного инструкция)
- [ ] Прочитаны оба документа (редактор проверил грамматику, юрист проверил条款)
- [ ] Договор интегрирован в `/legal/operator-agreement` на сайте
- [ ] При регистрации оператора → требуется согласие с договором (чекбокс)

**Где проверить:**
- https://tourhab.ru/legal/operator-agreement (должна быть страница)
- При регистрации `/auth/register?role=operator` — должен быть чекбокс согласия

---

## ДАННЫЕ И БД

### ✅ Phase 0.3: Миграция 083

- [ ] Применена на production: `migrations/083_*.sql`
- [ ] Таблицы существуют:
  ```sql
  SELECT COUNT(*) FROM leads;                 -- должно быть число
  SELECT COUNT(*) FROM lead_proposals;        -- должно быть число
  SELECT COUNT(*) FROM lead_activity_log;     -- должно быть число
  ```
- [ ] Индексы добавлены:
  ```sql
  \d leads                    -- видны индексы на status, created_at
  \d lead_proposals           -- видны индексы
  ```

### ✅ Phase 1.2: Тестовые данные

- [ ] Созданы 2 тестовых оператора в БД:
  ```sql
  INSERT INTO users (email, role, metadata) VALUES 
    ('test-op1@tourhab.ru', 'operator', '{"operator_name": "Test Ops 1"}'),
    ('test-op2@tourhab.ru', 'operator', '{"operator_name": "Test Ops 2"}');
  ```
- [ ] Созданы 10 тестовых лидов:
  ```sql
  INSERT INTO leads (name, phone, email, comment, status) VALUES
    ('Тест 1', '+7-999-111-11-11', 'test1@mail.ru', 'вулкан', 'new'),
    ...
  ```
- [ ] Все лиды обработаны через API (`POST /api/leads/process`)
- [ ] Все PDF созданы без ошибок (сохранились в `lead_proposals`)

---

## ИНТЕГРАЦИИ

### ✅ Phase 1.3: Telegram Bot

- [ ] Telegram bot token сохранён в `.env` на Timeweb (`TELEGRAM_BOT_TOKEN`)
- [ ] Bot имя: `@kamchatour_hub_bot`
- [ ] При `/start` бот отвечает (не ошибка)
- [ ] Кнопка "Привязать к аккаунту" работает
- [ ] После привязки — бот сохраняет chat_id в БД

**Тест:**
```
1. Открыть https://t.me/kamchatour_hub_bot
2. Нажать /start → bot отвечает приветствием
3. Нажать "Привязать" → bot подтверждает: "✅ Привязано"
4. Проверить БД: SELECT telegram_chat_id FROM users WHERE email='...';
```

- [ ] При обработке лида → уведомление приходит в Telegram тестовому оператору
  ```
  🎯 Лид обработан!
  [детали]
  [кнопка "Открыть в Hub"]
  ```

---

## PERFORMANCE И MONITORING

### ✅ Phase 1.5: Метрики

- [ ] Создана страница `/hub/operator/analytics/leads` (дашборд)
- [ ] Показывает: количество лидов, % обработки, среднее время
- [ ] SQL запросы оптимизированы (выполняются <1 сек)
- [ ] На production нет ошибок 5xx (проверяем Sentry)

### ✅ Health & Monitoring

- [ ] Создан `/api/health/lead-processor` endpoint
- [ ] Проверяет:
  - [ ] AI-провайдер доступен (DeepSeek via OpenRouter)
  - [ ] БД доступна (leads table)
  - [ ] Telegram bot отвечает
- [ ] Возвращает `{ status: 'ok', details: {...} }` при всё хорошо

**Тест:**
```bash
curl https://pospkam-pospktry-c1f3.twc1.net/api/health/lead-processor
# {"status":"ok","ai":"ok","db":"ok","telegram":"ok"}
```

---

## PRODUCTION DEPLOYMENT

### ✅ Phase 3.0: Git & Build

- [x] Все коммиты в main:
  - `feat: Add OperatorPromo section to homepage`
  - `ui: Add Leads menu item to OperatorNav`
  - `docs: Add operator agreement and onboarding`
  - `feat: Add health check for Lead Processor`

- [ ] **Финальный PR** с названием:
  ```
  feat(phase-1): AI Lead Processor visibility + operator onboarding
  ```
  - Описание указывает на KPI (Lead Processor live, 2–5 operations, 0 errors)
  - Checked: `npm run lint`, `npm test`, `npx tsc`

### ✅ Phase 3.1: Timeweb Deploy

- [ ] PR merged в main
- [ ] Timeweb Control Panel → App 159529 → Deploy from main
- [ ] Build завершился успешно (~5–10 мин)
- [ ] Деплой завершился (зелёный статус)

**Проверка на production:**

```
1. Открыть https://tourhab.ru → видна OperatorPromo секция ✅
2. Кликнуть "Зарегистрироваться" → редирект на /auth/register?role=operator ✅
3. Заполнить форму → создан аккаунт оператора ✅
4. Залогиниться → Hub работает, видна "Лиды" в меню ✅
5. Открыть /hub/operator/leads → страница загружается (пока пусто, ОК) ✅
6. Curl /api/health/lead-processor → зелёный статус ✅
```

### ✅ Phase 3.2: Холодный outreach операторов

- [ ] Собран список топ-10 операторов Камчатки (WhatsApp, email, Telegram)
- [ ] **Шаблон сообщения** написан и готов (в docs/EMAIL_TEMPLATE.md)
- [ ] Отправлено сообщение первым 5 операторам (параллельно, не спам)
- [ ] **Ожидаем ответ**: первый оператор регистрируется в течение 1–7 дней

**Шаблон:**
```
Привет, [Имя]!

Я запустил TourHab — платформу для туроператоров Камчатки.

Как это работает:
- Клиент пишет запрос ("хочу на вулкан")
- AI обрабатывает за 15 сек
- Вы получаете готовое PDF-предложение в Telegram
- Один клик — и клиент видит ответ

Первые 3 месяца бесплатно, без кредитной карты.

Хотели попробовать? → [ссылка регистрации]
```

---

## МЕТРИКИ УСПЕХА

| Метрика | Цель | Статус |
|---------|------|--------|
| OperatorPromo видна на главной | 100% | [ ] |
| Lead Processor UI работает | Загружается без ошибок | [ ] |
| Первые операторы зарегистрировались | 2–5 человек | [ ] |
| Лиды обработаны без ошибок | 100% из 10+ тестовых | [ ] |
| PDF генерируется | <20 сек на лид | [ ] |
| Telegram notifications | 100% доставляются | [ ] |
| Production uptime | 99.95%+ | [ ] |
| Холодный outreach начат | 5+ сообщений | [ ] |

---

## ТИПИЧНЫЕ ОШИБКИ (ЧЕГО НЕ ДЕЛАТЬ)

❌ **Не деплоить если:**
- Есть ошибки `npm run lint` или `npx tsc`
- Migrations 083 не применена на production БД
- TELEGRAM_BOT_TOKEN не установлен в env
- OPENROUTER_API_KEY не установлен (AI не будет работать)
- Не протестировано на реальном операторе

❌ **Частые баги:**
- OperatorPromo не видна → проверить динамический импорт в `page.tsx`
- Лиды не загружаются → проверить SQL запрос в `_LeadsClient.tsx`
- PDF не генерируется → проверить PDFKit лог в server console
- Telegram не приходит → проверить chat_id оператора в БД

---

## ПОСЛЕ ВЫКАТКИ

Если всё зелёное → создать issues для Фазы 2:

- [ ] Улучшить визуал главной (фото вулканов, медведей)
- [ ] Добавить реальные отзывы туристов
- [ ] Улучшить UI Lead Processor (ещё больше информации)
- [ ] А/B тест: блок с кейсом vs без кейса
- [ ] Интеграция календарей (iCal sync)

---

## ВЕРСИЯ И ИСТОРИЯ

**Версия:** 1.0  
**Дата:** 26 марта 2026  
**Автор:** AI Lead Development Team  
**Статус:** Для немедленного выполнения ✅

**Tracking:**
- [x] День 1: Видимость + навигация
- [x] День 2: Документация + договор
- [ ] День 3–7: Тестирование, Telegram, Deploy

---

**Вопросы?** → support@tourhab.ru или Telegram @kamchatour_hub_support
