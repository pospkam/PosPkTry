# Система Отчётности Совета Директоров

**Дата:** 25 марта 2026
**Версия:** 1.0

## Проблема

На совещании #1774159536382 (22.03):
- 8 из 9 агентов вернули ошибки
- Консенсус был фиктивным (говорил что всё хорошо, на самом деле ошибки)
- **Главное:** нет отчётности по исполнению инициатив из предыдущих совещаний
- Каждое совещание начинается "с чистого листа" без контекста

## Решение: Трёхуровневая Система Отчётности

### Уровень 1: Pre-Meeting Accountability Assessment

Перед открытием совещанияディректор видит:

```
📊 Отчёт об исполнении инициатив

Метрики:
  • Всего инициатив: 15
  • Выполнено: 73%
  • Просрочено: 3
  • Ошибки: 2
  • Заблокировано: 1

⚠️ Просроченные (3):
  1. [5д] Оптимизація описаний туров с низким CTR
     Статус: assigned | От: AI Аудитор
     Причина: нет ответа от контент-менеджера

  2. [4д] Анализ коммиссионной модели
     Статус: in_progress | От: AI Администратор
```

**Компонент:** `PremeetingAccountabilityBriefing.tsx`
**API:** GET `/api/agents/board-meeting/accountability`

### Уровень 2: Execution Tracking

Каждая инициатива имеет статус-машину:

```typescript
type ExecutionStatus =
  | 'assigned'      // Директор одобрил, ждём назначения ответственного
  | 'in_progress'   // Кто-то работает
  | 'done'          // Завершено
  | 'failed'        // Не вышло, причина может быть блокированием или ошибкой
  | 'blocked'       // Ожидает других решений
```

**API:** PUT `/api/agents/initiatives/[id]/execution`

```bash
curl -X PUT https://tourhab.ru/api/agents/initiatives/xyz/execution \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "progress_pct": 50,
    "notes": "Начали работу, ответвили feature ветку"
  }'
```

### Уровень 3: Accountability Loop

Перед каждым совещанием:

1. **Директор видит отчёт** о предыдущих решениях (Briefing)
2. **Агенты видят контекст** в своих prompts:
   - Что было решено в прошлый раз
   - Почему не выполнилось
   - Что теперь нужно скорректировать
3. **Генерируется Round 0** (невидимый для UI):
   - Система анализирует просроченность
   - Выявляет systemic issues
   - Подготавливает recommendations

## Файлы и API

### Новые файлы

| Файл | Назначение |
|------|-----------|
| `lib/agents/execution/execution-tracker.ts` | Сервис отслеживания статуса |
| `app/api/agents/initiatives/[id]/execution/route.ts` | API для обновления статуса |
| `app/api/agents/board-meeting/accountability/route.ts` | Pre-meeting briefing API |
| `components/admin/PremeetingAccountabilityBriefing.tsx` | UI компонента отчёта |

### Обновлены

| Файл | Изменение |
|------|-----------|
| `app/hub/admin/board-meeting/_BoardMeetingClient.tsx` | TODO: импортировать и показывать Briefing перед стартом |
| `app/api/agents/board-meeting/route.ts` | TODO: передавать контекст инициатив в agents |

## Интеграция в Board Meeting

### Шаг 1: Загрузка данных

```tsx
// В _BoardMeetingClient.tsx
const [accountabilityData, setAccountabilityData] = useState<AccountabilityData | null>(null);

useEffect(() => {
  fetch('/api/agents/board-meeting/accountability')
    .then(r => r.json())
    .then(setAccountabilityData);
}, []);
```

### Шаг 2: Вывод перед meeting start

```tsx
{stage === -1 && accountabilityData && (
  <PremeetingAccountabilityBriefing data={accountabilityData} />
)}
```

### Шаг 3: Передача контекста агентам

В `board-meeting/route.ts`, при запуске Round 1, добавить:

```typescript
const previousInitiatives = await ExecutionTracker.getLastMeetingInitiatives();
context.memories = {
  previous_initiatives: previousInitiatives,
  accountability_briefing: await ExecutionTracker.generatePreMeetingBriefing(),
};
```

## Мониторинг

### Директор может вручную обновлять статус

```bash
# Начать выполнение
curl -X PUT https://tourhab.ru/api/agents/initiatives/abc123/execution \
  -d '{"status":"in_progress", "progress_pct":10}'

# Завершить
curl -X PUT https://tourhab.ru/api/agents/initiatives/abc123/execution \
  -d '{"status":"done", "progress_pct":100}'

# Отметить ошибку
curl -X PUT https://tourhab.ru/api/agents/initiatives/abc123/execution \
  -d '{"status":"failed", "failure_reason":"Нет ресурсов на команду"}'
```

### Автоматический мониторинг (TODO)

- CRON каждый день: проверить просроченные инициативы
- Если > 3 дней и не done: отправить напоминание в Telegram
- Если ошибка и не fixed: Telegram alert

## Ожидаемый результат

Совещание #2 (25.03):
- ✅ Директор видит что решено (73%) и что нет (3 просроченные)
- ✅ Агенты готовят отчёты с контекстом прошлых решений
- ✅ Круглый стол может обсудить bottlenecks
- ✅ Нет фиктивных consensuses

---

**Следующий шаг:** Интегрировать Briefing в UI и добавить контекст в prompts агентов.
