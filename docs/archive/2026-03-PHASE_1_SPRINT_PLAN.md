> ⚠️ АРХИВ. Документ от 26 марта 2026.
> Описывает раннюю стратегию "маркетплейс + AI Lead Processor +
> operator onboarding". В апреле 2026 проект развернулся к
> модели "инструмент туриста" (PWA, офлайн-карта, гео-Кузьмич).
> См. актуальное направление в docs/SPRINT1_*, AGENTS.md.
>
> Содержит ссылки на удалённый endpoint /api/admin/migrations/apply
> и устаревшие статусы миграций. НЕ ИСПОЛЬЗОВАТЬ как руководство.

# Phase 1 Sprint Plan — AI Lead Processor + Operator Onboarding

**Обновлено:** 26 марта 2026 18:00 UTC+3
**Горизонт:** 7 дней | **Статус:** Код 100% готов. Блокер: миграции 083+084 на проде.

---

## ТЕКУЩИЙ СТАТУС (26 марта 2026)

### ЧТО СДЕЛАНО ✅ (всё задеплоено на прод)

| Задача | Статус | Коммит |
|--------|--------|--------|
| `OperatorPromo.tsx` на главной | ✅ на проде | 37563f64 |
| Пункт "Лиды" в OperatorNav | ✅ | 37563f64 |
| `lib/services/lead-processor.service.ts` | ✅ | cb441c66 |
| `lib/pdf/proposal-generator.ts` | ✅ | cb441c66 |
| `lib/notifications/lead-notify.ts` | ✅ | cb441c66 |
| `POST /api/leads/process` | ✅ | cb441c66 |
| `POST /api/leads/[id]/process` | ✅ | 37563f64 |
| `GET /api/leads/[id]/proposal` | ✅ | cb441c66 |
| `GET /api/leads/[id]/proposal/pdf` | ✅ | cb441c66 |
| `app/hub/operator/leads/_LeadsClient.tsx` | ✅ | cb441c66 |
| PATCH статусы лида (9 новых) | ✅ | 37563f64 |
| GET список лидов с AI-полями | ✅ | 37563f64 |
| `docs/OPERATOR_AGREEMENT_TEMPLATE.md` | ✅ | 37563f64 |
| `docs/OPERATOR_ONBOARDING.md` | ✅ | 37563f64 |
| `migrations/083_lead_processor.sql` | НАПИСАНА ✅ |  |
| Migration endpoint (`/api/admin/migrations/apply`) | ✅ + 083 добавлен | 670e33b7 |
| `robots.txt` исправлен (домен tourhab.ru) | ✅ | 0a9af271 |

### ЧТО НЕ СДЕЛАНО

| Задача | Причина | Приоритет |
|--------|---------|-----------|
| Деплой на прод (OperatorPromo видна) | Timeweb не пересобрал контейнер | КРИТИЧНО |
| Миграция 083 применена на проде | Требует ручного запуска после деплоя | КРИТИЧНО |
| Тестовые лиды в БД | Нет доступа к prod БД напрямую | HIGH |
| Analytics dashboard `/hub/operator/analytics/leads` | Не реализовано | MEDIUM |
| Health check `/api/health/lead-processor` | Не реализовано | MEDIUM |
| Demo видео / скриншоты | Нет записи | LOW |

---

## ПЛАН ПО ДНЯМ (обновлённый)

### ДЕНЬ 1-2 (ВЫПОЛНЕНО): Код + Документы

Всё что выше в "СДЕЛАНО" — уже в репозитории.

---

### ДЕНЬ 3 (СЕГОДНЯ): Деплой + Миграция

**Задача 1: Убедиться что Timeweb задеплоил последний коммит**

Проверить build ID:
```bash
curl -s https://tourhab.ru/ | grep -o '[a-zA-Z0-9_-]\{20,\}' | head -3
```
Если ID не сменился — вручную нажать Redeploy в Timeweb панели (App 159529).

**Задача 2: Применить миграцию 083 (после деплоя)**

```bash
curl -X POST https://tourhab.ru/api/admin/migrations/apply \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"migrations": ["083"], "dry_run": false}'
```

Ожидаемый ответ:
```json
{ "success": true, "results": [{ "migration": "083", "status": "success" }] }
```

**Задача 3: Создать тестовые лиды**

После применения миграции — создать через API:
```bash
curl -X POST https://tourhab.ru/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Иван Тестов","phone":"+79991234567","comment":"Вулкан летом 5 человек бюджет 500к","route_title":"Авачинский вулкан"}'
```

**Задача 4: Проверить AI-обработку**

```
/hub/operator/leads → кнопка "AI-обработать" → статус ai_qualified
```

---

### ДЕНЬ 4: Проверка Telegram + UX

**Задача 1: Проверить Telegram-уведомления**
- Создать лид → запустить обработку
- Убедиться что уведомление пришло в TELEGRAM_CHAT_ID
- Файл: `lib/notifications/lead-notify.ts` — уже реализовано, только проверить env vars

**Задача 2: Проверить PDF**
```bash
curl -H "Authorization: Bearer <ADMIN_JWT>" \
  https://tourhab.ru/api/leads/<LEAD_ID>/proposal/pdf \
  --output test.pdf
```

---

### ДЕНЬ 5: Analytics Dashboard

**Реализовать** `components/operator/LeadsAnalyticsMini.tsx` — встроить в `/hub/operator/leads`:
- Итого лидов за 7 дней
- % обработанных AI
- Среднее время обработки

SQL:
```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status IN ('ai_qualified','proposal_sent','converted')) AS processed,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)))::NUMERIC, 0) AS avg_sec
FROM leads
WHERE created_at > NOW() - INTERVAL '7 days'
  AND operator_id = $1;
```

**Health check** `GET /api/health/lead-processor`:
- Проверка AI-провайдера (ping OpenRouter)
- Проверка таблицы `lead_proposals`
- Проверка Telegram bot token

---

### ДЕНЬ 6-7: Операторы

**Холодный outreach** топ-5 операторов Камчатки:

```
Привет!

Запустил TourHab.ru — платформа автоматически обрабатывает входящие заявки:
AI за 15 сек квалифицирует, подбирает туры и генерирует PDF.
Вы получаете готовое предложение в Telegram — один клик подтвердить.

Первые 3 месяца бесплатно.
Регистрация: tourhab.ru/auth/register?role=operator
```

---

## KPI НЕДЕЛИ

| Метрика | Цель | Факт |
|---------|------|------|
| OperatorPromo видна на tourhab.ru | ДА | ❌ (deploy pending) |
| Миграция 083 на проде | ДА | ❌ (после деплоя) |
| Лидов обработано AI | 5+ | ❌ (нет тестовых) |
| PDF без ошибок | 100% | не проверено |
| Telegram уведомления | работают | не проверено на проде |
| Операторов outreach | 5+ | ❌ |

---

## ПОРЯДОК ДЕЙСТВИЙ СЕГОДНЯ

1. Убедиться что деплой прошёл (build ID сменился)
2. Применить миграцию 083 через API
3. Создать 3-5 тестовых лидов
4. Запустить AI-обработку → проверить PDF + Telegram
5. Если всё работает → outreach первым операторам
