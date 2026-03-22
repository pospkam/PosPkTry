/**
 * POST /api/agents/execute-tool
 *
 * Прямой вызов инструментов Совета директоров.
 * Агенты могут действовать, а не только говорить.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';
import {
  fixSQLColumnErrors,
  runDiagnosticQuery,
  applySchemaFix,
  sendBoardAlert,
  scanSQLErrors,
} from '@/lib/agents/tools/board-executor-tools';

const BodySchema = z.discriminatedUnion('tool', [
  z.object({
    tool: z.literal('sql_column_fix'),
    agency_file: z.string().optional(),
  }),
  z.object({
    tool: z.literal('db_diagnostic'),
    sql: z.string().min(10).max(2000),
    label: z.string().optional(),
  }),
  z.object({
    tool: z.literal('schema_fix'),
    description: z.string().min(5).max(255),
    sql: z.string().min(10).max(5000),
  }),
  z.object({
    tool: z.literal('board_alert'),
    agent_name: z.string().max(100),
    action: z.string().max(255),
    details: z.string().max(1000),
  }),
  z.object({
    tool: z.literal('scan_sql_errors'),
  }),
]);

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ошибка валидации', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    switch (data.tool) {
      case 'sql_column_fix': {
        const result = await fixSQLColumnErrors(data.agency_file);
        return NextResponse.json(result);
      }

      case 'db_diagnostic': {
        const result = await runDiagnosticQuery(data.sql, data.label);
        return NextResponse.json(result);
      }

      case 'schema_fix': {
        const result = await applySchemaFix(data.description, data.sql);
        return NextResponse.json(result);
      }

      case 'board_alert': {
        const result = await sendBoardAlert(data.agent_name, data.action, data.details);
        return NextResponse.json(result);
      }

      case 'scan_sql_errors': {
        const report = scanSQLErrors();
        const totalIssues = report.reduce((s, f) => s + f.issues.length, 0);
        return NextResponse.json({
          success: true,
          message: totalIssues === 0
            ? 'SQL-ошибок не обнаружено'
            : `Найдено ${totalIssues} SQL-ошибок в ${report.length} файлах`,
          details: { report, total_issues: totalIssues },
        });
      }

      default: {
        return NextResponse.json({ error: 'Неизвестный инструмент' }, { status: 400 });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Ошибка инструмента: ${msg}` }, { status: 500 });
  }
}
