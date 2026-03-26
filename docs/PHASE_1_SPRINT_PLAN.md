# 🚀 Спринт-план: Выкатка TourHab на продакшен (неделя 1)

**Цель:** Выкатить видимый блок про AI Lead Processor, подключить первых операторов, помериться на трафик и конверсию.

**KPI прогресса:**
- День 3: Блок "Для операторов" видим на главной оранжевый / 3+ оператора зарегистрировались
- День 5: Lead Processor обработал 10+ реальных лидов / PDF генерируется без ошибок
- День 7: Первое A/B тестирование (с кейсом vs без) на Telegram

---

## ДЕНЬ 1 (Понедельник): Фундамент + Видимость

### ✓ Фаза 0.1: Деплой блока "Для операторов"

**Что делать:**
1. **Общая** — Добавлена страница `OperatorPromo.tsx` на главную ✅ (уже сделано)
2. **Проверка локально** — `npm run dev` → открыть `http://localhost:3000` → скролл до блока "Для операторов"
3. **QA блока**
   - [ ] Текст на русском, без ошибок
   - [ ] 3 features видны (AI Квалификация, Умный матч, PDF+Telegram)
   - [ ] CTA кнопки кликабельны
   - [ ] Responsive на мобилке

**Файлы:** `app/page.tsx`, `components/homepage/OperatorPromo.tsx`

**Коммит:** `feat: Add OperatorPromo section to homepage`

### ✓ Фаза 0.2: Обновить OperatorNav в Hub

**Что делать:**
1. Добавить пункт **"Лиды"** в меню оператора (`components/operator/OperatorNav.tsx`)
2. Путь: `/hub/operator/leads` (уже существует)
3. Икона: `Brain` вместо `Mail` (уже есть)

**Проверка:**
- [ ] В Hub логиниться как оператор → в меню видно "Лиды"
- [ ] Клик ведёт на `/hub/operator/leads`

**Коммит:** `ui: Add Leads menu item to OperatorNav`

---

## ДЕНЬ 2 (Вторник): Подготовка Data + Договор

### ✓ Фаза 0.3: Юридическая база сделана

**Что делать:**
1. Создать файл `docs/OPERATOR_AGREEMENT_TEMPLATE.md` — шаблон договора
   - Лицензия на использование платформы
   - Ответственность (контент, double-booking, цены)
   - Комиссия платформы 12% от бронирования
   - Гарантии и исключения (AI может ошибаться)
   - Условия расторжения (30 дней уведомления)
   - GDPR/152-ФЗ: как мы храним и обрабатываем данные туристов

**Файл:** `docs/OPERATOR_AGREEMENT_TEMPLATE.md`

2. Создать файл `docs/OPERATOR_ONBOARDING.md` — инструкция регистрации
   - Шаг 1: Регистрация
   - Шаг 2: Заполнить профиль оператора (название, лицензия, реквизиты)
   - Шаг 3: Подключить Telegram (для уведомлений о лидах)
   - Шаг 4: Загрузить туры (CSV или ручной ввод)
   - Шаг 5: Первый тестовый лид

**Файл:** `docs/OPERATOR_ONBOARDING.md`

**Коммит:** `docs: Add operator agreement and onboarding templates`

### ✓ Фаза 0.4: Проверить миграцию 083 на проде

**Что делать:**
1. Проверить, что на production уже применена миграция `migrations/083_*.sql`
   - Таблицы существуют: `leads`, `lead_proposals`, `lead_activity_log`
   - Индексы на `lead_id`, `status`, `created_at`

2. Если НЕ применена — нужно выполнить вручную на Timeweb:
   ```bash
   # На продакшене
   psql ${DATABASE_URL} -f migrations/083_*.sql
   ```

**Чек-лист:**
- [ ] `SELECT COUNT(*) FROM leads;` возвращает число (не ошибку)
- [ ] `SELECT COUNT(*) FROM lead_proposals;` работает
- [ ] В схеме есть индексы на status, created_at

**Результат:** Database готова для первых лидов

---

## ДЕНЬ 3 (Среда): Первые операторы + Тестирование

### ✓ Фаза 1.1: Включить регистрацию операторов

**Что делать:**
1. Убедиться, что `/auth/register?role=operator` работает
2. Процесс регистрации оператора:
   - Email + пароль
   - Название компании
   - Лицензия (текст)
   - Telegram chat_id (для уведомлений) — опционально
   - Согласие с договором

**Тестирование:**
- [ ] Создать тестового оператора (роль `operator`)
- [ ] Залогиниться → попасть в Hub
- [ ] Видна страница `/hub/operator/leads` (пока пусто)

**Файлы:** `app/auth/register`, `lib/auth.ts`

2. **Создать фиксовых тестовых операторов** прямо в БД (для демо):
   ```sql
   INSERT INTO users (email, role, metadata) VALUES
     ('test-operator1@tourhab.ru', 'operator', '{"operator_name": "Камчатский клевок", "telegram_chat_id": 123456789}'),
     ('test-operator2@tourhab.ru', 'operator', '{"operator_name": "Вулканический тур", "telegram_chat_id": 123456790}');
   ```

**Коммит:** `feat: Enable operator registration + add test operators`

### ✓ Фаза 1.2: Первые тестовые лиды

**Что делать:**
1. Создать 5–10 тестовых лидов напрямую в БД:
   ```sql
   INSERT INTO leads (name, phone, email, comment, status) VALUES
     ('Иван Петров', '+7-999-123-45-67', 'ivan@test.ru', 'Хочу на вулкан летом на 5 человек, бюджет 500k', 'new'),
     ('Мария Сидорова', '+7-999-234-56-78', 'maria@test.ru', 'Рыбалка на чавычу, 3 дня, сентябрь, для двоих', 'new'),
     ...
   ```

2. Логиниться как тестовый оператор → `/hub/operator/leads`
   - [ ] Видна таблица с 5–10 лидами
   - [ ] Статус "Новый", ai_score пусто

3. **Запустить AI-обработку на каждом лиде**
   - [ ] Клик "AI-обработать" → крутилка, затем ✅
   - [ ] Статус меняется на "ai_qualified"
   - [ ] Появляется ai_score (80+ это хорошо)
   - [ ] В proposal_id теперь ID генерированного предложения

4. **Скачать PDF**
   - [ ] Клик на PDF → скачивается файл
   - [ ] Содержимое: название тура, фото, программа, цена, риски

**Метрика:** 100% лидов обработаны без ошибок. Сред. время 12–18 сек/лид.

**Коммит:** `test: Add fixture leads for operator testing`

---

## ДЕНЬ 4 (Четверг): Telegram-интеграция + Улучшение UI

### ✓ Фаза 1.3: Telegram-уведомления о лидах для операторов

**Что делать:**
1. Убедиться, что при обработке лида отправляется Telegram-нотификация оператору:
   - Файл: `lib/notifications/lead-notify.ts`
   - Формат сообщения:
     ```
     🎯 Новый лид обработан (ai_score 87/100)
     👤 Иван Петров | 5 человек | до 500k ₽
     🏔️ Рекомендация: Вулканический тур (5 дней)
     📄 [PDF предложение](ссылка)
     [Открыть в Hub](ссылка на лид в Hub)
     ```

2. **Протестировать:**
   - [ ] Установить Telegram bot (`/start` → bot привязывает chat_id)
   - [ ] Обработать лид → в Telegram приходит сообщение через 5–10 сек
   - [ ] Кликнуть на ссылку в сообщении → открывается лид в Hub

**Файлы:** `lib/notifications/lead-notify.ts`, `.env` (TELEGRAM_BOT_TOKEN)

**Коммит:** `feat: Add Telegram notifications for lead processing`

### ✓ Фаза 1.4: Улучшить демо на главной

**Что делать:**
1. На OperatorPromo добавить **live demo видео** (вместо текста):
   - Если видео есть (в `public/videos/lead-processor-demo.mp4`) — вставить в hero
   - Если нету — добавить анимированный GIF-скриншот или carousel фото

2. Или создать **interactive demo** — кликабельный тур по процессу

**Файл:** `components/homepage/OperatorPromo.tsx`

**Коммит:** `ui: Add demo video/carousel to OperatorPromo`

---

## ДЕНЬ 5 (Пятница): Мониторинг + Первая аналитика

### ✓ Фаза 1.5: Дашборд метрик Lead Processor

**Что делать:**
1. Создать страницу `/hub/operator/analytics/leads` — статистика по лидам:
   - Всего лидов (неделя, месяц)
   - Успешно обработано (%) с распределением по статусам
   - Среднее время обработки при AI
   - Конверсия (лид → booking)
   - Распределение по типам активности (вулканы, рыбалка, тrekking)

2. **SQL для метрик:**
   ```sql
   SELECT 
     COUNT(*) as total_leads,
     COUNT(*) FILTER (WHERE status IN ('ai_qualified', 'proposal_sent', 'converted')) as processed,
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::INT as avg_processing_sec,
     json_object_agg(status, count) as by_status
   FROM leads
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY operator_id;
   ```

3. **Компонент:** `components/operator/LeadsAnalytics.tsx`

**Метрика:** Дашборд доступен оператору → видит "120 лидов за неделю, 85% обработано, ~150 сек avg"

**Коммит:** `feat: Add leads analytics dashboard for operators`

### ✓ Фаза 1.6: Health check для Lead Processor

**Что делать:**
1. Добавить endpoint `/api/health/lead-processor`:
   - Проверяет AI-провайдер (DeepSeek)
   - Проверяет БД (leads table)
   - Проверяет Telegram bot связь
   - Возвращает `{ status: 'ok|error', details: {...} }`

2. **Использовать для проверки перед стартом:**
   - Админ может посмотреть `/hub/admin/health` → видит зелёный флаг Lead Processor OK

**Файл:** `app/api/health/lead-processor/route.ts`

**Коммит:** `feat: Add health check for Lead Processor infra`

---

## ДЕНЬ 6 (Суббота): PR + Обзор

### ✓ Фаза 2.1: Prepare PR в main

**Что делать:**
1. Создать PR с названием: `feat: Phase 1 — AI Lead Processor visibility + operator onboarding`
2. Description:
   ```
   - Add OperatorPromo section to homepage
   - Enable operator registration flow
   - Add Telegram notifications for leads
   - Add leads analytics dashboard
   - Add health check for Lead Processor
   - Add operator agreement + onboarding templates
   
   Phase 1 Metrics:
   - Homepage visibility: OperatorPromo section live
   - Lead processing: 100% automation, ~15 sec/lead
   - Operators onboarded: 2–5 first users
   - PDF generation: 0 errors on 50+ test leads
   ```

3. **Чек-лист для PR:**
   - [ ] `npm run build` — 0 ошибок
   - [ ] `npx tsc --noEmit` — 0 ошибок типов
   - [ ] `npm test` — все тесты зелёные
   - [ ] Все компоненты responsive на мобилке

**Коммит:** `docs: Add Phase 1 sprint progress report`

### ✓ Фаза 2.2: Internal demo + фидбек

**Что делать:**
1. Записать 5–минутное видео процесса:
   - Открыть главную → скролл до "Для операторов"
   - Клик "Попробуйте" → регистрация оператора
   - Hub → Лиды → AI-обработать лид → PDF → Telegram уведомление

2. Хранить в: `docs/PHASE_1_DEMO.md` или ссылка на YouTube/Loom

3. Отправить себе фидбек (если работает с командой):
   - "Готово к выкатке в production?"
   - "Какие баги нашли?"
   - "Что улучшить ещё?"

**Результат:** Визуальное доказательство work-in-progress

---

## ДЕНЬ 7 (Воскресенье): Деплой +启动 операторы

### ✓ Фаза 3.0: Merge + Deploy на production

**Что делать:**
1. **Merge PR** в `main` (если всё зелёное)
2. **Деплой на Timeweb**:
   ```bash
   # На Timeweb Control Panel:
   # - App 159529 (TourHab)
   # - Deploy → Branch: main → Start build
   # Ждём ~5–10 мин
   ```

3. **Проверить на production:**
   - [ ] Открыть https://tourhab.ru → видна OperatorPromo секция 🎯
   - [ ] Кликнуть "Попробуйте" → редирект на регистрацию
   - [ ] Зарегистрироваться как оператор → Hub работает
   - [ ] `/hub/operator/leads` загружается (пока пусто, но это ОК)

### ✓ Фаза 3.1: Холодный outreach первых операторов

**Что делать:**
1. **Список операторов** (из парсинга или вручную):
   - Top-5 операторов Камчатки (заранее найми контакты)
   - Примеры: "Камчатский клевок", "Вулканические туры", "Трекинг Kamchatka"

2. **Шаблон письма** (WhatsApp или email):
   ```
   Привет, [Имя]! 

   Я запустил TourHab.ru — платформу, которая обрабатывает заявки за 2–3 клика вместо 30 минут.

   Как это работает:
   - Лид приходит через чат на сайте
   - AI автоматом квалифицирует (бюджет, даты, активности)
   - Я подбираю подходящие туры и генерирую PDF-предложение
   - За ~15 сек вы получаете готовое предложение в Telegram
   - Вы его утверждаете — лид получает ответ

   Первые 3 месяца — бесплатно, без кредитной карты.

   Хотели бы попробовать? (ссылка на регистрацию)
   ```

3. **Отправить 5–10 операторам** (параллельный outreach)
4. **Ожидать 1–2 регистрации в неделю**

**Результат:** Первые операторы на платформе → реальные лиды → метрики

---

## 📊 Итоговая метрика на конец недели

| Метрика | Цель | Результат |
|---------|------|-----------|
| Видимость Lead Processor | OperatorPromo на главной | ✅ Готово |
| Обработка лидов | 100% автоматически | ✅ 0 ошибок |
| Первые операторы | 2–5 регистраций | 🎯 Начало outreach |
| PDF-генерация | 0 errors, <20 сек | ✅ 12–18 сек |
| Telegram notifications | 100% доставки | ⏳ Deploy pending |
| Health check | Доступен админу | ✅ Готово |
| Production uptime | 99.95% | 🎯 Мониторим |

---

## 🚨 Риски и что делать

| Риск | Mitigation |
|------|------------|
| **AI-ошибка в квалификации** | Human review для high-budget лидов (>300k). В фазе 2 добавить flagging. |
| **PDF-бага (файл не генерируется)** | Fallback: отправить лид текстом в Telegram. Логировать ошибки в Sentry. |
| **Оператор не регистрируется** | Дать опцию "Заказать демо" → я создам аккаунт вручную. |
| **Telegram bot не начнёт и не получает уведомлений** | Fallback: отправлять уведомления email. |
| **BD slow (много лидов)** | Добавить индекс на `status, created_at`. Кешировать статистику. |

---

## 📝 Tracking

- [ ] День 1: Видимость готова
- [ ] День 2: Юридика + КЭ
- [ ] День 3: Первые операторы + тесты
- [ ] День 4: Telegram + UX улучшение
- [ ] День 5: Метрики + Health
- [ ] День 6: PR готовый
- [ ] День 7: Production live + холодный outreach

**Чек-лист:**
- `npm run lint` — 0 ошибок
- `npx tsc --noEmit` — 0 ошибок
- `npm test` — все тесты ✅
- Timeweb healthcheck ✅

**Follow-up после спринта:**
- Собрать фидбек операторов
- Какие фичи просят чаще всего?
- Metrics: конверсия лид→booking, retention операторов
- Планировать Фазу 2 (визуал + доверие)

---

**Версия:** 1.0 | **Дата:** 26 марта 2026 | **Автор:** AI Lead Processor Team
