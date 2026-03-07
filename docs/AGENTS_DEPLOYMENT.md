# 🤖 Агентная система Kamchatka Tour Planning

## Статус: ✅ MVP готов к тестированию

- **88 маршрутов** загружено в БД
- **5 агентов** инициализировано и обучено
- **API endpoints** готовы
- **Система** готова к продакшену

---

## Архитектура

### 5 Специализированных Агентов

```
1. Intent Parser
   └─ Определяет что ищет турист
   └─ Выходные данные: JSON с критериями

2. Tour Researcher  
   └─ Ищет подходящие маршруты в базе
   └─ Возвращает TOP-3 по релевантности

3. Trip Planner
   └─ Составляет многодневный маршрут
   └─ Расчёт бюджета и логистики

4. Route Validator
   └─ Проверяет реальность плана
   └─ Проверяет: безопасность, погода, группу

5. Output Formatter
   └─ Красивая презентация результата
   └─ Пользовательский интерфейс
```

### Поток данных

```
Пользователь (вопрос)
    ↓
Intent Parser (распознание)
    ↓
Tour Researcher (поиск)
    ↓
Trip Planner (планирование)
    ↓
Route Validator (проверка)
    ↓
Output Formatter (вывод)
    ↓
Пользователь (ответ)
```

---

## Использование

### Локальное тестирование

```bash
# 1. Проверить что всё готово
node scripts/test-agents.js

# 2. Запустить Next.js сервер
npm run dev

# 3. Запустить FastAPI агентов (в отдельном терминале)
python3 crew/main.py

# 4. Тестировать API
# POST http://localhost:3000/api/agent/plan
# {
#   "query": "Хочу на вулкан в июле для 3 человек",
#   "group_size": 3,
#   "duration_days": 2
# }
```

### В Production

```bash
# API будет доступно через 
# https://pospkam-pospktry-c1f3.twc1.net/api/agent/plan
# 
# FastAPI запускается отдельным контейнером (Docker)
# Конфигурация в docker-compose.crewai.yml
```

---

## API Endpoints

### POST /api/agent/plan
Спланировать тур по описанию туриста

**Request:**
```json
{
  "query": "Хочу на вулкан в июле, группа 3 человека",
  "group_size": 3,
  "duration_days": 2,
  "difficulty": "Средний"
}
```

**Response:**
```json
{
  "success": true,
  "source": "crewai",
  "data": {
    "plan": {
      "title": "Путешествие в вулканы",
      "tours": ["2640", "1520"],
      "estimated_days": 2,
      "highlights": ["Вулкан Бакенинг", "Вулкан Горелый"]
    },
    "is_valid": true,
    "formatted": "🎯 ВАШ ИДЕАЛЬНЫЙ МАРШРУТ..."
  }
}
```

### GET /api/agent/search
Поиск маршрутов по критериям

**Query Parameters:**
- `category` - Категория (Вулканы, Термы, Горы, Гейзеры, Реки, Эко, Озёра)
- `difficulty` - Сложность (Лёгкий, Средний, Сложный)
- `limit` - Количество результатов (по умолчанию 5)

---

## База знаний

### Статистика

- **Всего маршрутов:** 88
- **Категории:** 7 (Вулканы, Термы, Горы, Гейзеры, Реки, Эко, Озёра)
- **С координатами:** 20 (~23%)
- **Без описания:** 0

### Структура места (Place)

```typescript
interface Place {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;  // Лёгкий, Средний, Сложный
  duration: string;    // Несколько часов, Целый день, Несколько дней
  coordinates?: [number, number];  // [lat, lng]
  district?: string;
  length_km?: number;
}
```

### Файлы

- `crew/knowledge-base.json` - База знаний для агентов
- `crew/agents.json` - Конфигурация и промпты
- `idilesom-tours.json` - Исходные парсенные данные
- `crew/main.py` - FastAPI сервер

---

## Улучшения для Production

### Срочные (Неделя 1)

- [ ] Добавить парсинг координат для маршрутов без lat/lng
- [ ] Загрузить изображения туров в S3
- [ ] Интегрировать real-time погоду в Route Validator
- [ ] Тестирование на реальных пользователях

### Важные (Неделя 2-3)

- [ ] RAG интеграция (pgvector семантический поиск)
- [ ] Tool calling (погода, цены, доступность)
- [ ] Multi-turn conversation (сохранение контекста)
- [ ] Интеграция с A/B тестированием

### Долгосрочно (Месяц 2)

- [ ] Fine-tuning модели на реальных диалогах
- [ ] Автоматический рефреш базы (переПарсинг раз в неделю)
- [ ] Advanced RAG с embedding overlap detection
- [ ] Voice interface (STT/TTS)

---

## Обучение агентов

### Базовый режим (MVP)

Агенты используют:
- Фиксированные системные промпты
- Базу знаний (88 маршрутов)
- Простую фильтрацию/ранжирование

### Продвинутый режим (будущее)

```python
# Few-shot learning
# Примеры хороших планов → обучение агентов

# RAG (Retrieval-Augmented Generation)
# Semantic search в 88 маршрутах

# Tool use
# Agent может вызывать: weather API, pricing API, maps API
```

---

## Файлы

```
crew/
├── main.py                      # FastAPI сервер
├── agent-trainer.py             # Скрипт обучения agentов
├── knowledge-base.json          # База знаний (88 маршрутов)
├── agents.json                  # Конфиг и промпты 5 агентов
├── docker-compose.crewai.yml    # Docker для FastAPI
├── requirements.txt             # Python зависимости
└── crewai-agent-entrypoint.py  # Entrypoint (stub)

app/api/agent/
└── plan/route.ts               # Next.js API endpoint

scripts/
├── test-agents.js              # Проверка системы
├── setup-agent-rag.ts          # Инициализация RAG
└── train-agents.ts (TODO)      # Обучение на примерах
```

---

## Примеры использования

### Пример 1: Туристка ищет вулкан

```
Q: "Я в отпуске неделю в июле. Хочу на вулкан но не очень сложно. 
     Группа 4 человека, бюджет 20тысяч на одного"

1. Intent Parser →  category: "Вулканы", difficulty: "Средний", group_size: 4, budget: 80000
2. Tour Researcher → Вулкан Авача, Вулкан Горелый, Авачинский перевал
3. Trip Planner → 2-day план (Авача + прогулка + термы)
4. Validator → ✅ Реально, безопасно, популярное место
5. Formatter →
   
   🎯 ВЫ НАЙДЁТЕ ВУЛКАН АВАЧИНСКИЙ!
   
   День 1: Встреча → Трансфер → Обед → Аккл
   День 2: Восхождение → Вершина → Спуск → Термы
   
   Цена: 18,000₽ (в рамках бюджета)
   ...
```

### Пример 2: Рыбак ищет рыбалку

```
Q: "Интересуюсь рыбалкой. Есть 3 дня в августе. 
     Где можно рыбу ловить? Сложностью помпощнее"

1. Intent Parser → category: "Рыбалка", difficulty: "Сложный", duration: 3 days
2. Tour Researcher → [поиск в базе по "рыба", "рыбалка", реки]
3. ...
```

---

## Debug/Troubleshooting

### CrewAI сервер не запускается

```bash
# Проверить зависимости
pip install -r crew/requirements.txt

# Попробовать вручную
python3 crew/main.py
```

### Агенты возвращают fallback

```bash
# FastAPI запущен? Проверить
curl http://localhost:8001/health

# Если нет, используется fallback (OK в MVP)
# Ошибки в /api/agent/plan?query=... вернёт fallback ответ
```

### Маршруты не загружены в БД

```bash
# Перезагрузить
node import-tours.js

# Проверить
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM places"
```

---

## Статус и Next Steps

**✅ Завершено:**
- 88 маршрутов спарсено и загружено в БД
- 5 агентов инициализировано
- API endpoint готов
- Тестирование локальное пройдено

**🔄 В progress:**
- Production deploy (docker-compose.crewai.yml)
- Integration testing

**⏳ TODO:**
- Fine-tuning на real user queries
- RAG embeddings integration
- Tool calling (weather, pricing)
- Multi-turn conversation

---

## Контакты & Support

- Документация: [docs/AI_ASSISTANTS_GUIDE.md](../docs/AI_ASSISTANTS_GUIDE.md)
- API docs: http://localhost:8001/docs (когда запущен FastAPI)
- Issue tracker: GitHub Issues

