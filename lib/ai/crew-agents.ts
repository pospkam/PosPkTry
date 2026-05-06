/**
 * lib/ai/crew-agents.ts
 * 5-агентный AI-пайплайн для планирования туров по Камчатке
 *
 * Архитектура:
 *   intent_parser → tour_researcher → planner → validator → output_formatter
 *
 * Провайдер: Anthropic Claude (claude-opus-4-6) через raw fetch
 * Base: паттерн из lib/ai/image-tagger.ts
 * Данные: PostgreSQL agent_route_knowledge (GIN FTS)
 */

import { query } from '@/lib/database';

// ─────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────

export interface IntentCriteria {
  category: string | null;
  difficulty: string | null;
  duration: string | null;
  season: string | null;
  group_size: string | null;
  budget: string | null;
}

export interface IntentResult {
  intent: 'search' | 'recommendation' | 'booking' | 'info';
  criteria: IntentCriteria;
  keywords: string[];
  language: 'ru' | 'en';
  urgency: number;
}

export interface RouteMatch {
  id: string;
  name: string;
  category: string;
  score: number;
  reason: string;
  tags: string[];
}

export interface ResearchResult {
  matches: RouteMatch[];
  total_found: number;
  filters_applied: string[];
}

export interface DayActivity {
  time: string;
  activity: string;
  tour: string | null;
  notes: string;
}

export interface PlanData {
  total_days: number;
  total_price_rub: number;
  group_size: string;
  difficulty: string;
  what_to_bring: string[];
  best_season: string;
  highlights: string[];
  [dayKey: string]: DayActivity[] | number | string | string[];
}

export interface PlanResult {
  plan: PlanData;
}

export interface ValidationResult {
  is_valid: boolean;
  warnings: string[];
  recommendations: string[];
  adjusted_plan: PlanResult | null;
}

export interface ProcessingStep {
  agent: string;
  status: 'success' | 'error' | 'skipped';
  durationMs: number;
  error?: string;
}

export interface CrewPipelineParams {
  query: string;
  groupSize?: number;
  budget?: number;
  durationDays?: number;
  difficulty?: string;
}

export interface CrewPipelineResult {
  formatted: string;
  intent: IntentResult;
  matches: RouteMatch[];
  plan: PlanResult;
  validation: ValidationResult;
  processingSteps: ProcessingStep[];
}

interface AgentRouteRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  lat: number | null;
  lng: number | null;
  source_url: string | null;
  source_name: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Общий помощник: вызов Anthropic Claude
// Паттерн из lib/ai/image-tagger.ts
// ─────────────────────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
  temperature = 0.2
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: maxTokens,
        temperature,
        // Cache the static agent persona prompt — reused across many agent calls in a round
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (
      data !== null &&
      typeof data === 'object' &&
      'content' in data &&
      Array.isArray((data as Record<string, unknown>).content)
    ) {
      const content = (data as { content: Array<Record<string, unknown>> }).content;
      const item = content[0];
      return typeof item?.text === 'string' ? item.text : null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Парсер JSON из ответа Claude (обрабатывает ```json ... ```)
// ─────────────────────────────────────────────────────────────────

function parseJsonFromText<T>(text: string): T | null {
  // Попытка 1: извлечь из ```json ... ``` блока
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text;

  // Попытка 2: найти первый {...} объект
  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Запрос маршрутов из PostgreSQL (GIN FTS)
// ─────────────────────────────────────────────────────────────────

async function fetchRoutesFromDB(
  categoryFilter: string | null,
  keywordQuery: string | null
): Promise<AgentRouteRecord[]> {
  const sql = `
    SELECT
      COALESCE(route_id::text, route_dedupe_key) AS id,
      title,
      description,
      category,
      lat::float  AS lat,
      lng::float  AS lng,
      source_url,
      source_name
    FROM agent_route_knowledge
    WHERE
      ($1::text IS NULL OR category = $1)
      AND (
        $2::text IS NULL
        OR to_tsvector('russian', search_text) @@ plainto_tsquery('russian', $2)
        OR title ILIKE '%' || $2 || '%'
      )
    ORDER BY
      CASE
        WHEN $2::text IS NOT NULL
        THEN ts_rank(
          to_tsvector('russian', search_text),
          plainto_tsquery('russian', $2)
        )
        ELSE 0
      END DESC NULLS LAST,
      title
    LIMIT 20
  `;

  try {
    const result = await query<AgentRouteRecord>(sql, [categoryFilter, keywordQuery]);
    return result.rows;
  } catch {
    // Fallback: FTS может упасть на коротких/спецсимвольных запросах — повторить без FTS
    try {
      const fallbackSql = `
        SELECT
          COALESCE(route_id::text, route_dedupe_key) AS id,
          title,
          description,
          category,
          lat::float AS lat,
          lng::float AS lng,
          source_url,
          source_name
        FROM agent_route_knowledge
        WHERE ($1::text IS NULL OR category = $1)
        ORDER BY title
        LIMIT 20
      `;
      const result = await query<AgentRouteRecord>(fallbackSql, [categoryFilter]);
      return result.rows;
    } catch {
      return [];
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Fallback-значения по умолчанию
// ─────────────────────────────────────────────────────────────────

function fallbackIntent(userQuery: string, groupSize: number): IntentResult {
  return {
    intent: 'search',
    criteria: {
      category: null, difficulty: null, duration: null,
      season: null, group_size: String(groupSize), budget: null,
    },
    keywords: userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 6),
    language: 'ru',
    urgency: 5,
  };
}

function fallbackResearch(routes: AgentRouteRecord[]): ResearchResult {
  return {
    matches: routes.slice(0, 3).map((r, i) => ({
      id: r.id, name: r.title, category: r.category,
      score: 0.5 - i * 0.05, reason: 'По умолчанию', tags: [r.category],
    })),
    total_found: Math.min(routes.length, 3),
    filters_applied: [],
  };
}

function fallbackPlan(matches: RouteMatch[], groupSize: number, durationDays: number): PlanResult {
  const main = matches[0];
  return {
    plan: {
      total_days: durationDays,
      total_price_rub: 0,
      group_size: `${groupSize} чел.`,
      difficulty: 'Средний',
      what_to_bring: ['Тёплая одежда', 'Непромокаемая куртка', 'Аптечка'],
      best_season: 'Июнь–Сентябрь',
      highlights: main ? [main.name] : ['Камчатка'],
      day_1: main ? [{ time: '09:00', activity: main.name, tour: main.id, notes: '' }] : [],
    },
  };
}

function fallbackValidation(): ValidationResult {
  return { is_valid: true, warnings: [], recommendations: [], adjusted_plan: null };
}

function fallbackFormatted(plan: PlanResult): string {
  const p = plan.plan;
  return [
    'Ваш маршрут по Камчатке:',
    '',
    `Продолжительность: ${p.total_days} дн.`,
    `Группа: ${p.group_size}`,
    `Сложность: ${p.difficulty}`,
    `Сезон: ${p.best_season}`,
    '',
    'Основные точки: ' + p.highlights.join(', '),
    '',
    'Что взять: ' + p.what_to_bring.join(', '),
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────
// Агент 1: Intent Parser — понимает что хочет турист
// ─────────────────────────────────────────────────────────────────

const INTENT_PARSER_PROMPT = `Ты парсер намерений туриста. Твоя задача — понять что ищет турист.

ВХОДНЫЕ ДАННЫЕ:
- Вопрос/запрос туриста на русском языке

ВЫХОДНЫЕ ДАННЫЕ (ТОЛЬКО JSON, без пояснений):
{
  "intent": "search|recommendation|booking|info",
  "criteria": {
    "category": "vulkani|rybalka|termalnye_istochniki|snegohod|dzhip|eco|trekking|medvedi|geyzery|mountains|rivers|lakes|morskie_progulki|vertoletnye_tury|null",
    "difficulty": "Лёгкий|Средний|Сложный|Очень сложный|null",
    "duration": "Несколько часов|Целый день|Несколько дней|Больше недели|null",
    "season": "Лето|Осень|Зима|Весна|null",
    "group_size": "Одиночка|Пара|Маленькая группа (2-5)|Средняя (6-10)|Большая (10+)|null",
    "budget": "Бюджетный|Средний|Премиум|null"
  },
  "keywords": ["ключевое_слово_1", "ключевое_слово_2"],
  "language": "ru|en",
  "urgency": 5
}

ПРАВИЛА:
- Всегда возвращай только JSON
- Если критерий не указан — null
- urgency: 1-10 (10 = срочно нужен тур)`;

async function intentParser(
  userQuery: string,
  groupSize: number
): Promise<IntentResult | null> {
  const userContent = `Запрос туриста: "${userQuery}"\nРазмер группы: ${groupSize} чел.`;
  const text = await callClaude(INTENT_PARSER_PROMPT, userContent, 500, 0.2);
  if (!text) return null;
  return parseJsonFromText<IntentResult>(text);
}

// ─────────────────────────────────────────────────────────────────
// Агент 2: Tour Researcher — находит подходящие маршруты
// ─────────────────────────────────────────────────────────────────

const TOUR_RESEARCHER_PROMPT = `Ты исследователь туров. Твоя задача — найти TOP-3 подходящих маршрута из предоставленного списка.

ВЫХОДНЫЕ ДАННЫЕ (ТОЛЬКО JSON, без пояснений):
{
  "matches": [
    {
      "id": "uuid-маршрута",
      "name": "Название маршрута",
      "category": "категория",
      "score": 0.95,
      "reason": "Почему этот маршрут подходит",
      "tags": ["тег1", "тег2"]
    }
  ],
  "total_found": 3,
  "filters_applied": ["фильтр1", "фильтр2"]
}

ПРАВИЛА:
- Возвращай ровно TOP-3 по релевантности (score 0-1)
- Объясняй на русском языке почему выбрал маршрут
- Если совпадений нет — предложи ближайшие альтернативы из списка
- id должен совпадать с id из входных данных`;

async function tourResearcher(
  intent: IntentResult,
  routes: AgentRouteRecord[]
): Promise<ResearchResult | null> {
  if (routes.length === 0) return null;

  // Компактное представление маршрутов (~40 токенов каждый)
  const compact = routes.map(r => ({
    id: r.id,
    name: r.title,
    cat: r.category,
    desc: (r.description ?? '').slice(0, 80),
  }));

  const userContent = `Намерение туриста:\n${JSON.stringify(intent, null, 0)}\n\nДоступные маршруты (${routes.length}):\n${JSON.stringify(compact)}`;
  const text = await callClaude(TOUR_RESEARCHER_PROMPT, userContent, 700, 0.2);
  if (!text) return null;
  return parseJsonFromText<ResearchResult>(text);
}

// ─────────────────────────────────────────────────────────────────
// Агент 3: Trip Planner — составляет маршрут по дням
// ─────────────────────────────────────────────────────────────────

const PLANNER_PROMPT = `Ты планировщик маршрутов Камчатки. Составь детальный план поездки.

ВЫХОДНЫЕ ДАННЫЕ (ТОЛЬКО JSON, без пояснений):
{
  "plan": {
    "day_1": [
      { "time": "08:00", "activity": "Описание активности", "tour": "id_маршрута_или_null", "notes": "Заметка" }
    ],
    "day_2": [...],
    "total_days": 2,
    "total_price_rub": 25000,
    "group_size": "3 чел.",
    "difficulty": "Средний",
    "what_to_bring": ["Непромокаемая куртка", "Треккинговые ботинки"],
    "best_season": "Июнь–Август",
    "highlights": ["Вулкан Авача", "Горячие источники"]
  }
}

ПРАВИЛА:
- Учитывай реальную географию Камчатки (расстояния большие)
- Максимум 2-3 активности в день
- Добавляй время на трансфер
- Учитывай сезонность и погоду`;

async function planner(
  matches: RouteMatch[],
  intent: IntentResult,
  durationDays: number,
  groupSize: number,
  budget: number | undefined
): Promise<PlanResult | null> {
  const userContent = [
    `Намерение: ${JSON.stringify(intent.criteria)}`,
    `Дней: ${durationDays}, Группа: ${groupSize} чел.`,
    budget ? `Бюджет: ~${budget.toLocaleString('ru-RU')} ₽` : '',
    `\nВыбранные маршруты:\n${JSON.stringify(matches)}`,
  ].filter(Boolean).join('\n');

  const text = await callClaude(PLANNER_PROMPT, userContent, 900, 0.6);
  if (!text) return null;
  return parseJsonFromText<PlanResult>(text);
}

// ─────────────────────────────────────────────────────────────────
// Агент 4: Route Validator — проверяет реалистичность плана
// ─────────────────────────────────────────────────────────────────

const VALIDATOR_PROMPT = `Ты валидатор туристических маршрутов Камчатки. Проверь реалистичность плана.

Проверяй:
1. Географическая доступность (расстояния реалистичны?)
2. Временные ограничения (хватит ли времени?)
3. Безопасность (нет опасных комбинаций?)
4. Сезонность (маршрут доступен в указанное время?)
5. Группа (группа соответствует сложности?)

ВЫХОДНЫЕ ДАННЫЕ (ТОЛЬКО JSON, без пояснений):
{
  "is_valid": true,
  "warnings": ["Предупреждение если есть"],
  "recommendations": ["Рекомендация"],
  "adjusted_plan": null
}

ПРАВИЛА:
- Если план нереалистичен — adjusted_plan с исправлениями
- Все тексты на русском языке`;

async function validator(
  plan: PlanResult,
  intent: IntentResult
): Promise<ValidationResult | null> {
  const userContent = `План:\n${JSON.stringify(plan.plan, null, 0)}\n\nКритерии: ${JSON.stringify(intent.criteria)}`;
  const text = await callClaude(VALIDATOR_PROMPT, userContent, 500, 0.2);
  if (!text) return null;
  return parseJsonFromText<ValidationResult>(text);
}

// ─────────────────────────────────────────────────────────────────
// Агент 5: Output Formatter — форматирует красивый ответ
// ─────────────────────────────────────────────────────────────────

const FORMATTER_PROMPT = `Ты форматер туристических планов. Представь план красиво и вдохновляюще.

Используй структуру:
- Заголовок с названием маршрута
- Основные параметры (дни, цена, группа, сложность)
- Программа по дням
- Что увидишь (достопримечательности)
- Что взять с собой
- Предупреждения (если есть)
- Вдохновляющую фразу в конце

ПРАВИЛА:
- Пиши на русском языке
- Будь конкретен: реальные место, время, активности
- Добавляй практичные советы опытного гида
- Ответ должен быть читаемым текстом (не JSON)`;

async function outputFormatter(
  plan: PlanResult,
  validation: ValidationResult,
  intent: IntentResult
): Promise<string | null> {
  const finalPlan = validation.adjusted_plan ?? plan;
  const userContent = [
    `План:\n${JSON.stringify(finalPlan.plan, null, 0)}`,
    validation.warnings.length > 0
      ? `\nПредупреждения: ${validation.warnings.join('; ')}`
      : '',
    validation.recommendations.length > 0
      ? `\nРекомендации: ${validation.recommendations.join('; ')}`
      : '',
    `\nЗапрос туриста: "${intent.keywords.join(' ')}"`,
  ].filter(Boolean).join('\n');

  return await callClaude(FORMATTER_PROMPT, userContent, 1200, 0.8);
}

// ─────────────────────────────────────────────────────────────────
// Оркестратор: runCrewPipeline
// ─────────────────────────────────────────────────────────────────

export async function runCrewPipeline(params: CrewPipelineParams): Promise<CrewPipelineResult> {
  const {
    query: userQuery,
    groupSize = 1,
    budget,
    durationDays = 3,
    difficulty,
  } = params;

  const steps: ProcessingStep[] = [];

  // — Шаг 1: Intent Parser ———————————————————————
  let intent: IntentResult;
  {
    const t = Date.now();
    try {
      const result = await intentParser(userQuery, groupSize);
      intent = result ?? fallbackIntent(userQuery, groupSize);
      steps.push({ agent: 'intent_parser', status: result ? 'success' : 'error', durationMs: Date.now() - t });
    } catch (e) {
      intent = fallbackIntent(userQuery, groupSize);
      steps.push({ agent: 'intent_parser', status: 'error', durationMs: Date.now() - t, error: String(e) });
    }
  }

  // Применить явно указанную сложность
  if (difficulty && intent.criteria.difficulty === null) {
    intent = { ...intent, criteria: { ...intent.criteria, difficulty } };
  }

  // — Шаг 2: Fetch routes from DB ———————————————
  let routes: AgentRouteRecord[] = [];
  {
    const t = Date.now();
    try {
      const kw = intent.keywords.length > 0 ? intent.keywords.join(' ') : null;
      routes = await fetchRoutesFromDB(intent.criteria.category, kw);
      steps.push({ agent: 'route_fetcher', status: 'success', durationMs: Date.now() - t });
    } catch (e) {
      steps.push({ agent: 'route_fetcher', status: 'error', durationMs: Date.now() - t, error: String(e) });
    }
  }

  // — Шаг 3: Tour Researcher ————————————————————
  let research: ResearchResult;
  {
    const t = Date.now();
    try {
      const result = await tourResearcher(intent, routes);
      research = result ?? fallbackResearch(routes);
      steps.push({ agent: 'tour_researcher', status: result ? 'success' : 'error', durationMs: Date.now() - t });
    } catch (e) {
      research = fallbackResearch(routes);
      steps.push({ agent: 'tour_researcher', status: 'error', durationMs: Date.now() - t, error: String(e) });
    }
  }

  // — Шаг 4: Trip Planner ————————————————————————
  let plan: PlanResult;
  {
    const t = Date.now();
    try {
      const result = await planner(research.matches, intent, durationDays, groupSize, budget);
      plan = result ?? fallbackPlan(research.matches, groupSize, durationDays);
      steps.push({ agent: 'planner', status: result ? 'success' : 'error', durationMs: Date.now() - t });
    } catch (e) {
      plan = fallbackPlan(research.matches, groupSize, durationDays);
      steps.push({ agent: 'planner', status: 'error', durationMs: Date.now() - t, error: String(e) });
    }
  }

  // — Шаг 5: Route Validator ————————————————————
  let validation: ValidationResult;
  {
    const t = Date.now();
    try {
      const result = await validator(plan, intent);
      validation = result ?? fallbackValidation();
      steps.push({ agent: 'validator', status: result ? 'success' : 'error', durationMs: Date.now() - t });
    } catch (e) {
      validation = fallbackValidation();
      steps.push({ agent: 'validator', status: 'error', durationMs: Date.now() - t, error: String(e) });
    }
  }

  // — Шаг 6: Output Formatter ————————————————————
  let formatted: string;
  {
    const t = Date.now();
    try {
      const result = await outputFormatter(plan, validation, intent);
      formatted = result ?? fallbackFormatted(plan);
      steps.push({ agent: 'output_formatter', status: result ? 'success' : 'error', durationMs: Date.now() - t });
    } catch (e) {
      formatted = fallbackFormatted(plan);
      steps.push({ agent: 'output_formatter', status: 'error', durationMs: Date.now() - t, error: String(e) });
    }
  }

  return {
    formatted,
    intent,
    matches: research.matches,
    plan,
    validation,
    processingSteps: steps,
  };
}
