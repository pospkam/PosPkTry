# Orchestrator v1.0 – Kamhub AI Agent Orchestra
Дата актуальности: февраль 2026

## Цель оркестратора
Один человек → один Дирижёр → 6–7 узкоспециализированных субагентов
Минимизировать контекст-свитчинг, рутину и баги
Сохранить полный контроль и качество senior-разработки

## Основные роли (агенты)

| Роль                          | Зона ответственности                              | Рекомендуемая модель (2026)       | Когда вызывать                                      | Доступные инструменты / файлы                  |
|-------------------------------|----------------------------------------------------|------------------------------------|-----------------------------------------------------|-------------------------------------------------|
| 0. Дирижёр / Architect        | План, приоритизация, ревью, merge, финальный PR    | Claude 4.6 Thinking / Grok-4.2    | Начало задачи + после каждого крупного цикла        | Всё                                             |
| 1. Frontend Sentinel          | App Router, компоненты, Tailwind, Zod, UI/UX       | Claude 4.6 / Gemini 3.1 Pro       | Всё, что касается UI, форм, стилей                 | /app, /components, tailwind.config.ts           |
| 2. Backend / DB Engineer      | Prisma, PostgreSQL, server actions, API routes     | Gemini 3.1 Pro / Claude 4.6       | Схемы БД, миграции, server logic, auth             | prisma/, /app/api, server actions               |
| 3. AI Integration Specialist  | LLM-промпты, RAG, tool calling, DeepSeek/Minimax/Grok | Grok-4.2 / DeepSeek R1            | Поиск туров, чат-бот, генерация описаний           | /lib/ai, prompts/, API-ключи                    |
| 4. Testing & Quality Agent    | Vitest, Playwright, k6, ESLint, type checks        | Gemini 3.1 Pro                    | Перед каждым PR, после крупных изменений           | __tests__, playwright.config.ts, .eslintrc      |
| 5. DevOps & Deployment Guard  | Docker, k8s manifests, CI/CD, Timeweb Cloud        | Claude 4.6 Thinking               | Деплой, scaling, secrets, инфраструктура           | Dockerfile, k8s/, .github/workflows             |
| 6. Researcher / Scout         | Конкуренты, тренды туризма/ИИ, legal, идеи         | Grok-4.2 / Perplexity             | Исследование фич, анализ рынка, compliance         | Web-поиск, анализ сайтов                        |

## Правила работы оркестратора

1. **Plan first – всегда**
   Перед любой задачей > 3 шагов Дирижёр пишет план в `tasks/active-<task-name>.md`
   Формат плана:
   ```markdown
   ## Задача: <название>
   Цель:
   Ожидаемый результат:
   Ограничения / требования:
   Шаги:
   1. ...
   2. ...
   Кто отвечает:
   - Frontend Sentinel → ...
   - Backend Engineer → ...
   Оценка времени / токенов:
   Риски:
   ```

2. **Subagent → one task per agent**
   Один субагент = одна узкая задача.
   Не даём агенту сразу 5 разных зон ответственности.

3. **Self-Improvement Loop**
   После любого замечания / бага → обновить `tasks/lessons.md`
   Пример:
   ```markdown
   ## 2026-02-24: Gemini 3.1 забыл про server component boundary
   Правило: всегда явно указывать "use server" в server actions
   Следующий промпт должен включать: "Помни про 'use server' директиву"
   ```

4. **Verification Before Done**
   Ни один агент не говорит «готово», пока не предоставит:
   - код / diff
   - тесты (если применимо)
   - объяснение изменений

5. **Lessons.md – священный файл**
   Обязательно читается Дирижёром в начале каждой сессии.

## Шаблон вызова субагента (пример для Дирижёра)

```markdown
Вызываю Frontend Sentinel:
Задача: сделать страницу личного кабинета гида /app/guide/[id]/dashboard
Требования:
- App Router, Server Components
- Tailwind + shadcn/ui
- Zod для формы
- Данные из Prisma (Bookings, Availability)
План шага: ...
Ожидаемый результат: готовые файлы + скриншоты
```

## Текущие предпочтения моделей (февраль 2026)

```json
{
  "Дирижёр": ["claude-4-6-thinking", "grok-4-2"],
  "Frontend": ["claude-4-6", "gemini-3-1-pro"],
  "Backend": ["gemini-3-1-pro", "claude-4-6"],
  "AI Integration": ["grok-4-2", "deepseek-r1"],
  "Testing": ["gemini-3-1-pro"],
  "DevOps": ["claude-4-6-thinking"],
  "Research": ["grok-4-2", "perplexity"]
}
```

## Ресурсы для быстрого старта

- `tasks/lessons.md` – уроки и правила
- `tasks/templates/` – шаблоны планов, PR, тестов
- `.agents/skills/` – навыки субагентов (react-doctor, prisma-check и т.д.)
- `config/models.json` – текущие модели и цены
