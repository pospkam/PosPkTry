/**
 * Outcomes grader для Kuzmich.
 *
 * После каждого ответа Kuzmich — асинхронная оценка качества через callAIFast.
 * Результаты хранятся в agent_knowledge (type='outcome').
 * Evolver подхватывает записи с низким score на следующем cron/evo цикле.
 */

import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';

interface OutcomeResult {
  score: number;       // 0–10
  issues: string[];    // описания проблем если score < 6
}

const KUZMICH_RUBRIC = `Оцени ответ чат-бота Кузьмич по шкале 0-10.
Критерии:
- Безопасность: упомянута если вопрос о маршруте/месте/активности (0-3 балла)
- Достоверность: реальные данные, без выдуманных фактов/цен/туров (0-3 балла)
- Тон хранителя: голос места, не менеджер продаж (0-2 балла)
- Полезность: ответ по существу, без лишней воды (0-2 балла)

Верни ТОЛЬКО JSON без пояснений: {"score": <число>, "issues": [<строки проблем>]}
Если проблем нет — issues пустой массив.`;

function isGradableQuestion(text: string): boolean {
  const keywords = [
    'маршрут', 'вулкан', 'поход', 'безопасно', 'опасно', 'медведь',
    'погода', 'снаряжение', 'когда', 'как добраться', 'где', 'что взять',
    'тур', 'экскурсия', 'гид', 'камчатка', 'озеро', 'источник',
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

export async function gradeKuzmichResponse(
  userText: string,
  botResponse: string,
  chatId: number,
): Promise<void> {
  // Грейдим только содержательные вопросы о Камчатке
  if (!isGradableQuestion(userText)) return;
  // Пропускаем очень короткие ответы (ошибки, перебои)
  if (botResponse.length < 50) return;

  try {
    const raw = await callAIFast([{
      role: 'user',
      content: `${KUZMICH_RUBRIC}\n\nВОПРОС ПОЛЬЗОВАТЕЛЯ: ${userText.slice(0, 300)}\n\nОТВЕТ КУЗЬМИЧА: ${botResponse.slice(0, 800)}`,
    }]);
    if (!raw) return;

    // Извлекаем JSON из ответа
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    const result = JSON.parse(jsonMatch[0]) as OutcomeResult;

    if (typeof result.score !== 'number') return;

    // Сохраняем только проблемные ответы (score < 7) и случайные выборки (каждый 10-й)
    const shouldSave = result.score < 7 || Math.random() < 0.1;
    if (!shouldSave) return;

    const slug = `outcome_kuz_${chatId}_${Date.now() % 1000000}`;
    const summary = result.issues.length > 0
      ? `Оценка ${result.score}/10. Проблемы: ${result.issues.join('; ')}`
      : `Оценка ${result.score}/10. Хороший ответ.`;

    await pool.query(
      `INSERT INTO agent_knowledge(slug, type, title, compiled_truth, agent_id, edit_count, created_at, updated_at)
       VALUES($1, 'outcome', $2, $3, 'kuzmich', 0, NOW(), NOW())
       ON CONFLICT(slug) DO NOTHING`,
      [
        slug,
        `Оценка ответа: ${result.score}/10`,
        `Вопрос: ${userText.slice(0, 150)}\nОтвет: ${botResponse.slice(0, 300)}\n\n${summary}`,
      ],
    );
  } catch {
    // Fire-and-forget — ошибка оценки не должна влиять на пользователя
  }
}

export interface OutcomeSummary {
  total_graded: number;
  avg_score: number;
  low_quality_count: number;
  recent_issues: string[];
}

export async function getOutcomesSummary(days = 7): Promise<OutcomeSummary> {
  const { rows } = await pool.query<{
    total: string;
    avg_score: string;
    low_count: string;
    issues: string[];
  }>(
    `SELECT
       COUNT(*) AS total,
       AVG(
         CASE
           WHEN compiled_truth ~ 'Оценка (\\d+)/10'
           THEN (regexp_match(compiled_truth, 'Оценка (\\d+)/10'))[1]::int
         END
       )::numeric(4,1) AS avg_score,
       COUNT(*) FILTER (
         WHERE compiled_truth ~ 'Оценка [0-6]/10'
       ) AS low_count,
       ARRAY_AGG(
         CASE
           WHEN compiled_truth LIKE '%Проблемы:%'
           THEN substring(compiled_truth FROM 'Проблемы: (.{1,100})')
         END
         ORDER BY created_at DESC
       ) FILTER (WHERE compiled_truth LIKE '%Проблемы:%') AS issues
     FROM agent_knowledge
     WHERE agent_id = 'kuzmich'
       AND type = 'outcome'
       AND created_at > NOW() - $1::interval`,
    [`${days} days`],
  );

  const row = rows[0];
  return {
    total_graded: parseInt(row?.total ?? '0'),
    avg_score: parseFloat(row?.avg_score ?? '0'),
    low_quality_count: parseInt(row?.low_count ?? '0'),
    recent_issues: (row?.issues ?? []).filter(Boolean).slice(0, 5),
  };
}
