/**
 * VibeCoder — AI-разработчик (самомодификация платформы).
 *
 * Анализирует кодовую базу, выявляет технический долг, предлагает улучшения
 * через систему одобрений. НЕ пишет файлы напрямую — только через approval.
 *
 *   code_analysis — анализ состояния кодовой базы + предложения к рефакторингу
 *   code_debt     — обзор технического долга: unused files, large monoliths, missing types
 */

import * as fs from 'fs';
import * as path from 'path';
import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

// ── Безопасный список директорий для чтения ────────────────────────────────

const ALLOWED_SCAN_DIRS = [
  'lib/agents',
  'lib/services',
  'components',
  'app/hub',
  'app/planner',
  'app/api/planner',
  'app/api/agents',
];

// Запрещённые пути — никогда не читать
const FORBIDDEN_PATHS = [
  'lib/auth',
  'middleware.ts',
  'app/api/payments',
  'app/api/safety/sos',
  '.env',
];

// Максимальный размер файла для анализа (байт)
const MAX_FILE_SIZE = 30_000;

// ── VibeCoder ─────────────────────────────────────────────────────────────────

export class VibeCoderAgency {
  private readonly rootDir: string;
  private briefing = '';
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  constructor() {
    this.rootDir = process.cwd();
  }

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'code_analysis': return this.analyzeCodebase();
      case 'code_debt':     return this.debtReport();
      default:              return { response: 'VibeCoderAgency: команда не поддерживается.' };
    }
  }

  // ── Анализ кодовой базы ─────────────────────────────────────────────────

  private async analyzeCodebase(): Promise<AgencyResult> {
    try {
      // 1. Статистика провальных исполнений (где нужен фикс кода)
      const [failedExec, recentErrors, largeFiles] = await Promise.all([
        pool.query<{ approval_id: string; description: string; execution_notes: string; updated_at: string }>(`
          SELECT
            id::text AS approval_id,
            COALESCE(description, '')    AS description,
            COALESCE(execution_notes, '') AS execution_notes,
            updated_at::text
          FROM agent_approvals
          WHERE execution_status = 'failed'
            AND updated_at >= NOW() - INTERVAL '14 days'
          ORDER BY updated_at DESC
          LIMIT 5
        `).catch(() => ({ rows: [] as { approval_id: string; description: string; execution_notes: string; updated_at: string }[] })),

        pool.query<{ action_type: string; fail_count: string }>(`
          SELECT
            action_type,
            COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL)::text AS fail_count
          FROM ai_actions_log
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY action_type
          HAVING COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL) > 0
          ORDER BY COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL) DESC
          LIMIT 5
        `),

        // Найти самые большие файлы в разрешённых директориях
        this.scanLargeFiles(),
      ]);

      // 2. Читаем структуру одной проблемной директории как пример
      const agentFiles = this.listFiles('lib/agents/agencies').slice(0, 12);

      let uiPatternsStr = '';
      if (this.tools.scanComponentPatterns) {
        try {
          const patterns = await this.tools.scanComponentPatterns();
          if (patterns.success && patterns.details?.patterns) {
            uiPatternsStr = `\nUI-паттерны (30д): ${JSON.stringify(patterns.details.patterns)}`;
          }
        } catch { /* non-critical */ }
      }

      const data = {
        failed_executions: failedExec.rows,
        ai_errors:         recentErrors.rows,
        large_files:       largeFiles,
        agent_files:       agentFiles,
      };

      const prompt = [
        'Ты AI-разработчик на стеке Next.js 15 / TypeScript / PostgreSQL.',
        'Анализируй реальные данные ниже и предложи ОДНО конкретное улучшение кода.',
        '',
        'ПРОВАЛИВШИЕСЯ ИНИЦИАТИВЫ (последние 14 дней):',
        failedExec.rows.length > 0
          ? failedExec.rows.map(r => `  "${r.description}": ${r.execution_notes}`).join('\n')
          : '  нет данных',
        '',
        'ОШИБКИ AI-АГЕНТОВ (7 дней):',
        recentErrors.rows.length > 0
          ? recentErrors.rows.map(r => `  ${r.action_type}: ${r.fail_count} ошибок`).join('\n')
          : '  нет ошибок',
        '',
        'БОЛЬШИЕ ФАЙЛЫ (потенциальные монолиты):',
        largeFiles.slice(0, 5).map(f => `  ${f.path}: ${f.lines} строк`).join('\n') || '  не найдено',
        '',
        'ФАЙЛЫ АГЕНТОВ:',
        agentFiles.join(', '),
        uiPatternsStr ? `\nUI-ПАТТЕРНЫ КОМПОНЕНТОВ:${uiPatternsStr}` : '',
        '',
        'Правила:',
        '1. Предложи ОДНО изменение. Не общие слова — конкретный файл и что именно изменить',
        '2. Обоснуй ДАННЫМИ выше (ошибки, размер файла, провалы)',
        '3. Если нет реальных проблем — скажи "Критических улучшений не обнаружено"',
        '4. confidence: high/medium/low',
        'Если есть предложение — формат: файл → что изменить → почему (данные из БД)',
      ].join('\n');

      const fullPrompt = this.briefing ? `${this.briefing}\n\n${prompt}` : prompt;
      const aiText = await callAIWaterfall([{ role: 'user', content: fullPrompt }]);

      const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const response = [
        `<b>Анализ кода — ${date}</b>`,
        `Файлов агентов: ${agentFiles.length} | Провалов (14д): ${failedExec.rows.length} | AI-ошибок: ${recentErrors.rows.length}`,
        '',
        aiText ?? 'Анализ недоступен — AI провайдер не ответил.',
      ].join('\n');

      return { response, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        response: `<b>Анализ кода — ошибка</b>\n\n${msg}`,
        data: {},
      };
    }
  }

  // ── Технический долг ────────────────────────────────────────────────────

  private async debtReport(): Promise<AgencyResult> {
    try {
      const largeFiles = await this.scanLargeFiles();

      // Подсчёт общего числа файлов по директориям
      const stats = ALLOWED_SCAN_DIRS.map(dir => ({
        dir,
        count: this.listFiles(dir).length,
      }));

      const lines = [
        '<b>Технический долг</b>',
        '',
        'БОЛЬШИЕ ФАЙЛЫ (>300 строк):',
        largeFiles.slice(0, 8).map(f => `  ${f.path}: ${f.lines} строк`).join('\n') || '  не найдено',
        '',
        'ФАЙЛЫ ПО ДИРЕКТОРИЯМ:',
        stats.map(s => `  ${s.dir}: ${s.count} файлов`).join('\n'),
      ].join('\n');

      return {
        response: lines,
        data: { large_files: largeFiles, dir_stats: stats },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { response: `Долговой отчёт недоступен: ${msg}`, data: {} };
    }
  }

  // ── Утилиты сканирования ────────────────────────────────────────────────

  private isForbidden(filePath: string): boolean {
    return FORBIDDEN_PATHS.some(f => filePath.includes(f));
  }

  private listFiles(relDir: string): string[] {
    try {
      const absDir = path.join(this.rootDir, relDir);
      if (!fs.existsSync(absDir)) return [];
      return fs.readdirSync(absDir)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
        .filter(f => !this.isForbidden(path.join(relDir, f)));
    } catch {
      return [];
    }
  }

  private async scanLargeFiles(): Promise<Array<{ path: string; lines: number; size: number }>> {
    const results: Array<{ path: string; lines: number; size: number }> = [];

    for (const dir of ALLOWED_SCAN_DIRS) {
      const absDir = path.join(this.rootDir, dir);
      if (!fs.existsSync(absDir)) continue;

      try {
        const files = fs.readdirSync(absDir);
        for (const file of files) {
          if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
          const relPath = path.join(dir, file);
          if (this.isForbidden(relPath)) continue;

          const absPath = path.join(absDir, file);
          try {
            const stat = fs.statSync(absPath);
            if (stat.size > MAX_FILE_SIZE) continue; // Слишком большой — пропускаем
            const content = fs.readFileSync(absPath, 'utf-8');
            const lineCount = content.split('\n').length;
            if (lineCount > 300) {
              results.push({ path: relPath, lines: lineCount, size: stat.size });
            }
          } catch {
            // Файл недоступен — пропускаем
          }
        }
      } catch {
        // Директория недоступна
      }
    }

    return results.sort((a, b) => b.lines - a.lines);
  }
}
