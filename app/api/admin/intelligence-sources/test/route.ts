import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/admin/intelligence-sources/test
 * Test a single RSS URL or trigger a full intelligence cycle
 *
 * Body: { action: 'test_rss', url: string } — test one RSS feed
 * Body: { action: 'run_cycle' } — run full intelligence cycle NOW
 */
export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request);
  if (authErr instanceof NextResponse) return authErr;

  try {
    const body = await request.json() as { action: string; url?: string };

    if (body.action === 'test_rss') {
      if (!body.url) {
        return NextResponse.json({ success: false, error: 'url is required' }, { status: 400 });
      }
      // Dynamic import to avoid circular deps
      const res = await fetch(body.url, {
        headers: { 'User-Agent': 'TourHab-Intelligence/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return NextResponse.json({
          success: false,
          error: `HTTP ${res.status} ${res.statusText}`,
        });
      }
      const xml = await res.text();
      const isAtom = xml.includes('<entry>');
      const itemCount = (xml.match(isAtom ? /<entry>/gi : /<item>/gi) || []).length;

      return NextResponse.json({
        success: true,
        format: isAtom ? 'atom' : 'rss',
        items_found: itemCount,
        content_length: xml.length,
        sample: xml.substring(0, 500),
      });
    }

    if (body.action === 'run_cycle') {
      const { runIntelligenceCycle } = await import('@/lib/services/intelligence-monitor.service');
      const report = await runIntelligenceCycle();

      return NextResponse.json({
        success: true,
        report: {
          timestamp: report.timestamp,
          raw_signals: report.raw_count,
          findings: report.domains.length,
          duration_ms: report.duration_ms,
          domains: report.domains.map(d => ({
            domain: d.domain,
            urgency: d.urgency,
            summary: d.summary,
            action_items: d.action_items,
          })),
        },
      });
    }

    if (body.action === 'publish_ai_news') {
      const { runIntelligenceCycle } = await import('@/lib/services/intelligence-monitor.service');
      const { postAINewsToChannel } = await import('@/lib/notifications/telegram-channel');

      const report = await runIntelligenceCycle();
      const aiFindings = report.domains.filter(
        d => d.domain === 'ai_tech' && (d.urgency === 'critical' || d.urgency === 'notable')
      );

      const published: Array<{ urgency: string; summary: string; ok: boolean; error?: string }> = [];
      for (const f of aiFindings) {
        const result = await postAINewsToChannel(f);
        published.push({ urgency: f.urgency, summary: f.summary.slice(0, 100), ...result });
      }

      return NextResponse.json({
        success: true,
        total_findings: report.domains.length,
        ai_findings: aiFindings.length,
        published,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin/intelligence-sources/test] failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
