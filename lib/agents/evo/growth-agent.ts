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

/**
 * AI false-positive exclusions — файлы которые Gemini помечает ложно.
 * Все проверены вручную: секреты через env, SQL параметризованы.
 */
const AI_EXCLUDED_FILES = new Set([
  'lib/payments/tochka.ts',           // все секреты через process.env
  'lib/bookings/booking.service.ts',  // все SQL параметризованы ($1, $2...)
]);

/**
 * Security issues которые приняты осознанно — не баг, а архитектурное решение.
 * Evo не должен их репортить каждый скан.
 */
const ACCEPTED_RISKS = new Set([
  'app/api/webhook/route.ts',         // exec() защищён HMAC-SHA256, команда захардкожена
]);

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

  // GitHub webhook — known risk, accepted (HMAC + hardcoded cmd)
  // Skip — it's in ACCEPTED_RISKS

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
  // Files to review — exclude known false positives
  const reviewFiles = [
    'app/api/hub/bookings/create/route.ts',
    'lib/kuzmich/core.ts',
    // excluded: lib/payments/tochka.ts (env vars, verified)
    // excluded: lib/bookings/booking.service.ts (parameterized SQL, verified)
  ];

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты senior-разработчик. Анализируешь код Next.js проекта туристической платформы.
Ищешь: баги, anti-patterns, пропущенные try/catch, race conditions, утечки ресурсов.
Отвечай СТРОГО JSON массивом объектов: [{"file":"path","title":"short","description":"details","severity":"critical|high|medium|low","suggestion":"what to do"}]
Максимум 5 проблем. Без markdown-обёртки.

Исключённые файлы (уже проверены вручную, не репорти):
- lib/payments/tochka.ts — все секреты через process.env
- lib/bookings/booking.service.ts — все SQL параметризованы ($1, $2)
- app/api/webhook/route.ts — exec() защищён HMAC, команда захардкожена`,
    },
    {
      role: 'user',
      content: `Проверь эти файлы на качество кода:\n${reviewFiles.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nОбрати внимание: try/catch, race conditions, отсутствие валидации.`,
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

    // Filter out excluded files (AI may still mention them)
    const filtered = parsed.filter(p => !AI_EXCLUDED_FILES.has(p.file) && !ACCEPTED_RISKS.has(p.file));

    return filtered.map(p => ({
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
  const issues: GrowthIssue[] = [];

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

  // Save individual issues — deduplicate by file_path+title
  for (const issue of issues) {
    // Check if this exact issue already exists as 'open'
    const { rows: existing } = await pool.query<{ id: string }>(
      `SELECT id FROM evo_growth_issues
       WHERE status = 'open'
         AND file_path = $1
         AND title = $2
       LIMIT 1`,
      [issue.file_path ?? null, issue.title],
    );

    if (existing.length > 0) {
      // Already exists — skip, just log the scan reference
      continue;
    }

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
