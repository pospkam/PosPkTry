/**
 * GET /api/admin/audit-knowledge
 *
 * READ-ONLY diagnostic for agent_route_knowledge.
 * Returns JSON (default) or pretty HTML with ?format=html.
 *
 * Auth: requires admin (via requireAdmin middleware).
 *
 * Canonical data model rules:
 *   kind='place' → lat/lng NOT NULL, location_type NOT NULL, activity_type NULL
 *   kind='route' → activity_type NOT NULL, has geometry/track in payload, location_type NULL
 *   kind='tour'  → should NOT be here (belongs in operator_tours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Severity = 'high' | 'medium' | 'low';

interface IssueCheck {
  id: string;
  title: string;
  severity: Severity;
  countSql: string;
  sampleSql: string;
}

interface InfoCheck {
  id: string;
  title: string;
  sql: string;
}

const ISSUE_CHECKS: IssueCheck[] = [
  {
    id: 'tour_in_knowledge',
    title: "kind='tour' in agent_route_knowledge (belongs in operator_tours)",
    severity: 'high',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='tour'`,
    sampleSql: `SELECT id, title, source_name FROM agent_route_knowledge WHERE kind='tour' ORDER BY title LIMIT $1`,
  },
  {
    id: 'place_without_coords',
    title: "kind='place' without lat/lng",
    severity: 'high',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='place' AND (lat IS NULL OR lng IS NULL)`,
    sampleSql: `SELECT id, title, source_name FROM agent_route_knowledge WHERE kind='place' AND (lat IS NULL OR lng IS NULL) ORDER BY title LIMIT $1`,
  },
  {
    id: 'route_without_geometry',
    title: "kind='route' without geometry/track in payload (GPX gives only a point)",
    severity: 'high',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge
               WHERE kind='route' AND NOT (payload ? 'geometry') AND NOT (payload ? 'track')`,
    sampleSql: `SELECT id, title, source_name FROM agent_route_knowledge
                WHERE kind='route' AND NOT (payload ? 'geometry') AND NOT (payload ? 'track')
                ORDER BY title LIMIT $1`,
  },
  {
    id: 'null_kind',
    title: 'kind IS NULL',
    severity: 'high',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind IS NULL`,
    sampleSql: `SELECT id, title, source_name FROM agent_route_knowledge WHERE kind IS NULL ORDER BY title LIMIT $1`,
  },
  {
    id: 'invalid_kind',
    title: "kind NOT IN ('place','route','tour')",
    severity: 'high',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind IS NOT NULL AND kind NOT IN ('place','route','tour')`,
    sampleSql: `SELECT id, title, kind FROM agent_route_knowledge WHERE kind IS NOT NULL AND kind NOT IN ('place','route','tour') ORDER BY kind LIMIT $1`,
  },
  {
    id: 'place_without_location_type',
    title: "kind='place' without location_type",
    severity: 'medium',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='place' AND location_type IS NULL`,
    sampleSql: `SELECT id, title FROM agent_route_knowledge WHERE kind='place' AND location_type IS NULL ORDER BY title LIMIT $1`,
  },
  {
    id: 'place_with_activity_type',
    title: "kind='place' has activity_type (should only be on routes)",
    severity: 'medium',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='place' AND activity_type IS NOT NULL`,
    sampleSql: `SELECT id, title, activity_type FROM agent_route_knowledge WHERE kind='place' AND activity_type IS NOT NULL ORDER BY title LIMIT $1`,
  },
  {
    id: 'route_without_activity_type',
    title: "kind='route' without activity_type",
    severity: 'medium',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='route' AND activity_type IS NULL`,
    sampleSql: `SELECT id, title FROM agent_route_knowledge WHERE kind='route' AND activity_type IS NULL ORDER BY title LIMIT $1`,
  },
  {
    id: 'route_with_location_type',
    title: "kind='route' has location_type (only places should)",
    severity: 'low',
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='route' AND location_type IS NOT NULL`,
    sampleSql: `SELECT id, title, location_type FROM agent_route_knowledge WHERE kind='route' AND location_type IS NOT NULL ORDER BY title LIMIT $1`,
  },
];

const INFO_CHECKS: InfoCheck[] = [
  {
    id: 'total',
    title: 'Total records',
    sql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge`,
  },
  {
    id: 'by_kind',
    title: 'Breakdown by kind',
    sql: `SELECT kind, COUNT(*)::int AS n FROM agent_route_knowledge GROUP BY kind ORDER BY n DESC`,
  },
  {
    id: 'by_source',
    title: 'Breakdown by source_name (top 10)',
    sql: `SELECT source_name, COUNT(*)::int AS n FROM agent_route_knowledge GROUP BY source_name ORDER BY n DESC LIMIT 10`,
  },
  {
    id: 'by_location_type',
    title: 'Places: breakdown by location_type',
    sql: `SELECT location_type, COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='place' GROUP BY location_type ORDER BY n DESC LIMIT 20`,
  },
  {
    id: 'by_activity_type',
    title: 'Routes: breakdown by activity_type',
    sql: `SELECT activity_type, COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='route' GROUP BY activity_type ORDER BY n DESC LIMIT 20`,
  },
];

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError instanceof NextResponse) return authError;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';
  const samples = Math.min(Math.max(parseInt(searchParams.get('samples') || '3', 10), 1), 20);

  const report: {
    generatedAt: string;
    info: Array<{ id: string; title: string; rows: unknown[]; error?: string }>;
    issues: Array<{ id: string; title: string; severity: Severity; count: number; samples: unknown[]; error?: string }>;
    summary: { high: number; medium: number; low: number };
  } = {
    generatedAt: new Date().toISOString(),
    info: [],
    issues: [],
    summary: { high: 0, medium: 0, low: 0 },
  };

  // Info checks
  for (const c of INFO_CHECKS) {
    try {
      const { rows } = await pool.query(c.sql);
      report.info.push({ id: c.id, title: c.title, rows });
    } catch (e) {
      report.info.push({ id: c.id, title: c.title, rows: [], error: (e as Error).message });
    }
  }

  // Issue checks
  for (const c of ISSUE_CHECKS) {
    try {
      const { rows: cr } = await pool.query(c.countSql);
      const count = cr[0]?.n ?? 0;
      const samplesRows = count > 0 ? (await pool.query(c.sampleSql, [samples])).rows : [];
      report.issues.push({ id: c.id, title: c.title, severity: c.severity, count, samples: samplesRows });
      if (count > 0) report.summary[c.severity] += count;
    } catch (e) {
      report.issues.push({
        id: c.id,
        title: c.title,
        severity: c.severity,
        count: 0,
        samples: [],
        error: (e as Error).message,
      });
    }
  }

  if (format === 'html') {
    return new NextResponse(renderHtml(report), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.json(report);
}

function renderHtml(report: {
  generatedAt: string;
  info: Array<{ id: string; title: string; rows: unknown[]; error?: string }>;
  issues: Array<{ id: string; title: string; severity: Severity; count: number; samples: unknown[]; error?: string }>;
  summary: { high: number; medium: number; low: number };
}): string {
  const escape = (s: unknown) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

  const severityColor: Record<Severity, string> = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
  const severityIcon: Record<Severity, string> = { high: '🔴', medium: '🟡', low: '🔵' };

  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Knowledge Audit</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:2rem auto;padding:1rem;color:#111;background:#fafafa}
  h1,h2{margin-top:2rem}
  .summary{display:flex;gap:1rem;margin:1rem 0;flex-wrap:wrap}
  .chip{padding:.5rem 1rem;border-radius:.5rem;font-weight:600;color:white}
  .issue{background:white;border:1px solid #e5e7eb;border-radius:.5rem;padding:1rem;margin-bottom:.5rem}
  .issue.ok{opacity:.5}
  .issue h3{margin:0 0 .25rem;font-size:1rem}
  .count{font-weight:700;font-size:1.2rem}
  .sample{font-family:ui-monospace,monospace;font-size:.8rem;color:#555;margin:.25rem 0;padding:.25rem .5rem;background:#f3f4f6;border-radius:.25rem;overflow-x:auto}
  table{border-collapse:collapse;width:100%;margin:.5rem 0}
  td,th{padding:.4rem .6rem;text-align:left;border-bottom:1px solid #eee;font-size:.9rem}
  th{background:#f3f4f6}
  .muted{color:#6b7280;font-size:.85rem}
</style></head><body>
<h1>🔍 agent_route_knowledge — audit</h1>
<p class="muted">Generated: ${escape(report.generatedAt)}</p>

<div class="summary">
  <span class="chip" style="background:${severityColor.high}">🔴 High: ${report.summary.high}</span>
  <span class="chip" style="background:${severityColor.medium}">🟡 Medium: ${report.summary.medium}</span>
  <span class="chip" style="background:${severityColor.low}">🔵 Low: ${report.summary.low}</span>
</div>

<h2>Overview</h2>
${report.info
  .map(
    (i) => `<div class="issue"><h3>${escape(i.title)}</h3>${
      i.error
        ? `<div class="sample">ERROR: ${escape(i.error)}</div>`
        : `<table>${i.rows
            .map((r) => {
              const rec = r as Record<string, unknown>;
              const keys = Object.keys(rec);
              return `<tr>${keys.map((k) => `<td><b>${escape(k)}</b>: ${escape(rec[k])}</td>`).join('')}</tr>`;
            })
            .join('')}</table>`
    }</div>`,
  )
  .join('')}

<h2>Issues</h2>
${report.issues
  .map((c) => {
    const ok = c.count === 0 && !c.error;
    return `<div class="issue ${ok ? 'ok' : ''}">
      <h3>${ok ? '✅' : severityIcon[c.severity]} ${escape(c.title)}</h3>
      <div><span class="count" style="color:${ok ? '#10b981' : severityColor[c.severity]}">${c.count}</span> <span class="muted">[${c.severity}]</span></div>
      ${c.error ? `<div class="sample">ERROR: ${escape(c.error)}</div>` : ''}
      ${(c.samples as unknown[])
        .map((s) => `<div class="sample">${escape(JSON.stringify(s))}</div>`)
        .join('')}
    </div>`;
  })
  .join('')}

<p class="muted">Tip: append <code>?format=json</code> for machine-readable output, <code>?samples=10</code> for more examples.</p>
</body></html>`;
}
