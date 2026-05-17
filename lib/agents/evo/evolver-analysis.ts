import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import { searchExternalTools, trackToolUsage } from '@/lib/agents/tools/taaft-search';
import { telegramService } from '@/lib/notifications/telegram';

export interface EvolverAnalysisResult {
  analyzed: number;
  proposals: number;
  external_tools_found: number;
  skipped: boolean;
  duration_ms: number;
}

interface ActionStat {
  action_type: string;
  count: string;
  error_count: string;
  avg_tokens_out: string | null;
  total_cost_usd: string | null;
}

interface AiProposal {
  action_type: string;
  problem: string;
  suggestion: string;
  need_external_tool: boolean;
  tool_query?: string;
}

const COOLDOWN_HOURS = 20;

export async function runEvolverAnalysis(): Promise<EvolverAnalysisResult> {
  const startedAt = Date.now();

  // Skip if already ran in the last 20 hours
  const { rows: lastRunRows } = await pool.query<{ updated_at: string }>(
    `SELECT updated_at FROM agent_memory
     WHERE agent_id = 'evo' AND memory_type = 'evolver_analysis' AND key = 'last_run'
     LIMIT 1`,
  );
  if (lastRunRows.length > 0) {
    const elapsed = Date.now() - new Date(lastRunRows[0].updated_at).getTime();
    if (elapsed < COOLDOWN_HOURS * 60 * 60 * 1000) {
      return { analyzed: 0, proposals: 0, external_tools_found: 0, skipped: true, duration_ms: 0 };
    }
  }

  // 1. Aggregate ai_actions_log: last 7 days, group by action_type
  const { rows: stats } = await pool.query<ActionStat>(
    `SELECT
       action_type,
       COUNT(*)::text                                                  AS count,
       COUNT(CASE WHEN metadata->>'error' IS NOT NULL THEN 1 END)::text AS error_count,
       ROUND(AVG(tokens_out))::text                                    AS avg_tokens_out,
       ROUND(SUM(cost_usd), 4)::text                                   AS total_cost_usd
     FROM ai_actions_log
     WHERE created_at > NOW() - INTERVAL '7 days'
     GROUP BY action_type
     ORDER BY
       COUNT(CASE WHEN metadata->>'error' IS NOT NULL THEN 1 END) DESC,
       COUNT(*) DESC
     LIMIT 15`,
  );

  if (stats.length === 0) {
    await markLastRun(0);
    return { analyzed: 0, proposals: 0, external_tools_found: 0, skipped: false, duration_ms: Date.now() - startedAt };
  }

  // 2. AI analysis
  const proposals = await analyzeWithAI(stats);

  // 3. For each proposal with need_external_tool, search the catalog and notify
  const externalToolsFound = await processProposals(proposals);

  // 4. Mark last run
  await markLastRun(proposals.length);

  return {
    analyzed: stats.length,
    proposals: proposals.length,
    external_tools_found: externalToolsFound,
    skipped: false,
    duration_ms: Date.now() - startedAt,
  };
}

async function analyzeWithAI(stats: ActionStat[]): Promise<AiProposal[]> {
  const prompt = `Анализ логов AI-агентов туристической платформы Камчатки за 7 дней.

Статистика по action_type:
${JSON.stringify(stats, null, 2)}

Найди проблемные типы действий: высокий error_count, подозрительно низкий avg_tokens_out (< 15 = пустой ответ), высокий total_cost_usd без результата.

Верни JSON без markdown-обёртки:
{"issues":[{"action_type":"...","problem":"...","suggestion":"...","need_external_tool":true,"tool_query":"..."}]}

Правила:
- Включай только action_type с реальными проблемами
- need_external_tool = true только если задача решается внешним AI-сервисом (распознавание, перевод, GPX, лавины и т.д.)
- tool_query — на русском, кратко ("определить растение по фото", "анализ GPX-трека")
- Не более 5 issues`;

  try {
    const raw = await callAIFast([{ role: 'user', content: prompt }]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as { issues?: AiProposal[] };
    return Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [];
  } catch {
    return [];
  }
}

async function processProposals(proposals: AiProposal[]): Promise<number> {
  let externalToolsFound = 0;
  const tgLines: string[] = [];

  for (const p of proposals) {
    // Upsert proposal to agent_memory (one record per action_type)
    await pool.query(
      `INSERT INTO agent_memory (agent_id, memory_type, key, value, source)
       VALUES ('evo', 'proposal', $1, $2, 'evolver_analysis')
       ON CONFLICT (agent_id, memory_type, key)
       DO UPDATE SET value = $2, updated_at = NOW()`,
      [`proposal_${p.action_type}`, JSON.stringify(p)],
    );

    if (!p.need_external_tool || !p.tool_query) continue;

    const tools = await searchExternalTools(p.tool_query, 2);
    if (tools.length === 0) continue;

    externalToolsFound += tools.length;
    void Promise.all(tools.slice(0, 1).map((t) => trackToolUsage(t.slug)));

    const tool = tools[0];
    const isFree = tool.is_free ? 'бесплатный' : 'платный';
    tgLines.push(
      `<b>${p.action_type}</b>: ${p.problem}\n` +
      `Инструмент: ${tool.name} (${isFree}) — ${tool.url}`,
    );
  }

  if (tgLines.length > 0) {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (chatId) {
      const text = `<b>Evolver Analysis</b> — найдены внешние инструменты:\n\n${tgLines.join('\n\n')}`;
      void telegramService.sendMessage({
        chatId,
        text: text.slice(0, 2000),
        parseMode: 'HTML',
      });
    }
  }

  return externalToolsFound;
}

async function markLastRun(proposalsCount: number): Promise<void> {
  await pool.query(
    `INSERT INTO agent_memory (agent_id, memory_type, key, value, source)
     VALUES ('evo', 'evolver_analysis', 'last_run', $1, 'evolver_analysis')
     ON CONFLICT (agent_id, memory_type, key)
     DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ ran_at: new Date().toISOString(), proposals: proposalsCount })],
  );
}
