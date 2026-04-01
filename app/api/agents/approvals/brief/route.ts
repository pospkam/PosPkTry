/**
 * POST /api/agents/approvals/brief
 * Генерирует ТЗ (техническое задание) для реализации одобренной инициативы.
 * Возвращает markdown-текст, готовый для передачи в Claude Code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  approval_id: z.string().uuid(),
});

const ACTION_TYPE_LABELS: Record<string, string> = {
  code_change:         'Изменение кода',
  sql_query_fix:       'Исправление SQL',
  ui_copy_change:      'Изменение текстов UI',
  price_change:        'Изменение цен',
  booking_rule_change: 'Изменение правил бронирования',
  commission_change:   'Изменение комиссии',
  bulk_notify:         'Массовое уведомление',
  prompt_optimize:     'Оптимизация промпта',
  schedule_suggest:    'Предложение расписания',
  api_scope_expand:    'Расширение API',
  tour_auto_cancel:    'Авто-отмена тура',
};

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const body: unknown = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, error: 'Неверный JSON' }, { status: 400 });

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Неверный approval_id' }, { status: 422 });
  }

  const { approval_id } = parsed.data;

  const row = await pool.query(
    `SELECT id, action_type, description, context, topic,
            requested_by, executor_name, execution_status, created_at
     FROM agent_approvals
     WHERE id = $1 AND status = 'approved'
     LIMIT 1`,
    [approval_id]
  );

  if (row.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Инициатива не найдена или не одобрена' }, { status: 404 });
  }

  const ap = row.rows[0] as {
    id: string;
    action_type: string;
    description: string | null;
    context: Record<string, unknown> | null;
    topic: string | null;
    requested_by: string | null;
    executor_name: string | null;
    execution_status: string | null;
    created_at: string;
  };

  const actionLabel = ACTION_TYPE_LABELS[ap.action_type] ?? ap.action_type;
  const contextStr = ap.context ? JSON.stringify(ap.context, null, 2) : 'нет';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты технический менеджер туристической платформы KamchatourHub (Next.js 15, PostgreSQL, TypeScript strict).
Ты пишешь ТЗ для Claude Code — AI-разработчика, который будет реализовывать задачу.

Правила написания ТЗ:
1. Конкретно — файлы, таблицы, endpoints, компоненты
2. Без воды — только то что нужно сделать
3. Проверяемые критерии готовности
4. Если action_type = code_change — обязательно указать файлы
5. Если action_type = sql_query_fix — написать корректный SQL
6. Язык: русский, markdown-форматирование`,
    },
    {
      role: 'user',
      content: `Напиши ТЗ для реализации следующей одобренной инициативы совета директоров.

**Тип действия:** ${actionLabel} (${ap.action_type})
**Тема совещания:** ${ap.topic ?? 'не указана'}
**Предложил:** ${ap.requested_by ?? 'агент'}
**Исполнитель:** ${ap.executor_name ?? 'не назначен'}

**Описание инициативы:**
${ap.description ?? 'нет описания'}

**Контекст (данные агента):**
${contextStr}

Структура ТЗ:
## Задача
[одна строка — суть]

## Контекст
[почему это нужно, что предложил агент]

## Что нужно сделать
[нумерованный список конкретных шагов]

## Технические детали
[файлы, таблицы, API — всё конкретное]

## Критерии готовности
[как проверить что задача выполнена]`,
    },
  ];

  let brief: string;
  try {
    brief = await callAIFast(messages);
  } catch {
    // Fallback: структурированный brief без AI
    brief = `## Задача\n${actionLabel}: ${ap.description ?? ap.action_type}\n\n## Контекст\nИнициатива одобрена советом директоров.\nПредложил: ${ap.requested_by ?? 'агент'}\nТема: ${ap.topic ?? 'не указана'}\n\n## Что нужно сделать\n${ap.description ?? 'Реализовать инициативу согласно описанию.'}\n\n## Технические детали\n\`\`\`json\n${contextStr}\n\`\`\`\n\n## Критерии готовности\n- Изменение протестировано\n- Нет TypeScript ошибок\n- Задеплоено на main`;
  }

  return NextResponse.json({ success: true, brief });
}
