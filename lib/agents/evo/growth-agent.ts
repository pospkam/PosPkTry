/**
 * Growth Agent — сканирует здоровье проекта.
 * Находит: мёртвый код, дыры безопасности, tech debt, баги, UX-проблемы.
 * Записывает в evo_growth_issues для последующей эволюции.
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface GrowthIssue {
  category: 'dead_code' | 'security' | 'performance' | 'bug' | 'tech_debt' | 'ux';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file_path?: string;
  line_number?: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface GrowthScanResult {
  issues: GrowthIssue[];
  scan_id: string;
  duration_ms: number;
}

// ── Code-level scans ─────────────────────────────────────────────────────

// Known dead modules (0 imports, confirmed in audit 2026-04-24)
const DEAD_MODULES = [
  'lib/agents/learning/experiment-tracker.ts',
  'lib/agents/learning/feedback-loop.ts',
  'lib/agents/learning/pattern-recognition.ts',
  'lib/agents/evolution/optimized-runner.ts',
  'lib/agents/execution/evolution-loop.ts',
  'lib/agents/execution/vibe-coder-executor.ts',
  'lib/agents/sdk/evo-sdk-agent.ts',
  'lib/agents/sdk/hacker-sdk-agent.ts',
  'lib/agents/sdk/rescue-sdk-agent.ts',
  'lib/agents/context-hub.ts',
  'lib/agents/observation-logger.ts',
  'lib/agents/validation/director-standards.ts',
  'lib/events/subscribers.ts',
  'lib/analytics/lead-tracking.ts',
  'lib/legal/ai-legal-review.ts',
];

async function scanDeadCode(): Promise<GrowthIssue[]> {
  return DEAD_MODULES.map(f => ({
    category: 'dead_code' as const,
    severity: 'low' as const,
    file_path: f,
    title: `Мёртвый модуль: ${f.split('/').pop()}`,
    description: `${f} — 0 импортов, не используется.`,
    suggestion: 'Удалить файл или подключить к рабочему процессу.',
  }));
}

async function scanSecurity(): Promise<GrowthIssue[]> {
  const issues: GrowthIssue[] = [];

  // GitHub webhook — RCE risk
  issues.push({
    category: 'security',
    severity: 'high',
    file_path: 'app/api/webhook/route.ts',
    title: 'GitHub webhook вызывает exec() на сервере',
    description: 'При компрометации WEBHOOK_SECRET атакующий получает RCE через /usr/local/bin/kamhub-update.',
    suggestion: 'Добавить IP-allowlist, sandbox deploy, или перейти на GitHub Actions auto-deploy.',
  });

  return issues;
}

async function scanTechDebt(): Promise<GrowthIssue[]> {
  const issues: GrowthIssue[] = [];

  // Temporary endpoints still in codebase
  issues.push({
    category: 'tech_debt',
    severity: 'medium',
    file_path: 'app/api/admin/run-089/route.ts',
    title: 'Временный эндпоинт run-089 не удалён',
    description: 'Миграция фото применена, но эндпоинт остался в коде.',
    suggestion: 'Удалить файл app/api/admin/run-089/route.ts.',
  });

  issues.push({
    category: 'tech_debt',
    severity: 'medium',
    file_path: 'app/api/admin/run-115/route.ts',
    title: 'Временный эндпоинт run-115 не удалён',
    description: 'Миграция outreach_queue применена, но эндпоинт остался.',
    suggestion: 'Удалить файл app/api/admin/run-115/route.ts.',
  });

  return issues;
}

async function scanPerformance(): Promise<GrowthIssue[]> {
  const issues: GrowthIssue[] = [];

  // Check for missing indexes on hot tables
  try {
    const { rows } = await pool.query<{ table_name: string; column_name: string }>(`
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      WHERE c.table_name IN ('operator_bookings', 'agent_memory', 'ai_actions_log')
        AND c.column_name IN ('created_at', 'booking_status', 'agent_id')
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = c.table_name
            AND indexdef LIKE '%' || c.column_name || '%'
        )
      LIMIT 10
    `);

    for (const r of rows) {
      issues.push({
        category: 'performance',
        severity: 'medium',
        file_path: 'migrations/',
        title: `Нет индекса: ${r.table_name}.${r.column_name}`,
        description: `Колонка ${r.column_name} в ${r.table_name} часто фильтруется но без индекса.`,
        suggestion: `Добавить CREATE INDEX idx_${r.table_name}_${r.column_name} ON ${r.table_name}(${r.column_name}).`,
      });
    }
  } catch {
    // DB might not have the tables yet
  }

  return issues;
}

// ── AI analysis of code quality ────────────────────────────────────────────

async function aiCodeReview(): Promise<GrowthIssue[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты senior-разработчик. Анализируешь код Next.js проекта туристической платформы.
Ищешь: баги, anti-patterns, пропущенные try/catch, race conditions, утечки ресурсов.
Отвечай СТРОГО JSON массивом объектов: [{"file":"path","title":"short","description":"details","severity":"critical|high|medium|low","suggestion":"what to do"}]
Максимум 5 проблем. Без markdown-обёртки.`,
    },
    {
      role: 'user',
      content: `Проверь эти файлы на качество кода:

1. app/api/hub/bookings/create/route.ts — создание бронирований
2. lib/payments/tochka.ts — платёжный модуль Точка Банк
3. lib/kuzmich/core.ts — AI-бот Kuzmich
4. lib/bookings/booking.service.ts — сервис бронирований

Обрати внимание: try/catch, race conditions, SQL injection, hardcoded secrets.`,
    },
  ];

  try {
    const result = await callAIWithModelDirect(messages, 'google/gemini-2.0-flash-001');
    if (!result) return [];

    const jsonStr = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr) as Array<{
      file: string; title: string; description: string;
      severity: string; suggestion: string;
    }>;

    return parsed.map(p => ({
      category: 'bug' as const,
      severity: (p.severity as GrowthIssue['severity']) || 'medium',
      file_path: p.file,
      title: p.title,
      description: p.description,
      suggestion: p.suggestion,
    }));
  } catch {
    return [];
  }
}

// ── Main scan orchestrator ────────────────────────────────────────────────

export async function runGrowthScan(scanType: string = 'full'): Promise<GrowthScanResult> {
  const start = Date.now();
  let issues: GrowthIssue[] = [];

  if (scanType === 'full' || scanType === 'code') {
    const [dead, debt] = await Promise.all([scanDeadCode(), scanTechDebt()]);
    issues.push(...dead, ...debt);
  }

  if (scanType === 'full' || scanType === 'security') {
    issues.push(...await scanSecurity());
  }

  if (scanType === 'full' || scanType === 'performance') {
    issues.push(...await scanPerformance());
  }

  if (scanType === 'full') {
    issues.push(...await aiCodeReview());
  }

  // Save scan result
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO evo_growth_scans (scan_type, status, issues_found, duration_ms, summary)
     VALUES ($1, 'complete', $2, $3, $4) RETURNING id`,
    [scanType, issues.length, Date.now() - start, `Найдено ${issues.length} проблем`],
  );
  const scanId = rows[0]?.id ?? '';

  // Save individual issues
  for (const issue of issues) {
    await pool.query(
      `INSERT INTO evo_growth_issues (scan_id, category, severity, file_path, line_number, title, description, suggestion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [scanId, issue.category, issue.severity, issue.file_path ?? null, issue.line_number ?? null, issue.title, issue.description, issue.suggestion],
    );
  }

  // Update agent state
  const cycleCount = await getState('cycle_count');
  await pool.query(
    `UPDATE evo_agent_state SET value = $1, updated_at = NOW() WHERE key = 'cycle_count'`,
    [`${cycleCount + 1}`],
  );
  await pool.query(
    `UPDATE evo_agent_state SET value = $1, updated_at = NOW() WHERE key = 'last_scan_at'`,
    [JSON.stringify(new Date().toISOString())],
  );

  return { issues, scan_id: scanId, duration_ms: Date.now() - start };
}

async function getState(key: string): Promise<number> {
  const { rows } = await pool.query<{ value: string }>(
    `SELECT value FROM evo_agent_state WHERE key = $1`,
    [key],
  );
  return rows[0] ? parseInt(rows[0].value) : 0;
}
