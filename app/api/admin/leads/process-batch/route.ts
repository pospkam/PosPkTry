/**
 * POST /api/admin/leads/process-batch
 * Пакетная обработка лидов через AI Lead Processor
 * Защита: CRON_SECRET + requireAdmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { processSingleLead } from '@/lib/services/lead-processor.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BatchSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  status: z.enum(['new', 'ai_qualified', 'proposal_sent', 'converted']).default('new'),
  dryRun: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  // Проверка CRON_SECRET как резервная опция
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');

  // Либо admin user, либо valid CRON_SECRET
  const isAdmin = (await requireAdmin(req)) instanceof NextResponse === false;
  const isValidCron = cronSecret && headerSecret === cronSecret && headerSecret.length > 8;

  if (!isAdmin && !isValidCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { limit, status, dryRun } = parsed.data;

  try {
    // Получить лиды со статусом
    const leads = await query(
      `SELECT id, name, email, phone, comment, route_title, created_at
       FROM leads
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [status, limit]
    );

    const results: Array<{
      leadId: string;
      name: string;
      status: string;
      error?: string;
      duration?: number;
    }> = [];

    for (const lead of leads.rows as Array<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
      comment: string;
      route_title?: string;
      created_at: string;
    }>) {
      const startTime = Date.now();

      try {
        if (!dryRun) {
          await processSingleLead(lead.id, {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            comment: lead.comment,
            routeTitle: lead.route_title,
          });
        }

        results.push({
          leadId: lead.id,
          name: lead.name,
          status: 'processed',
          duration: Date.now() - startTime,
        });
      } catch (err) {
        results.push({
          leadId: lead.id,
          name: lead.name,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          duration: Date.now() - startTime,
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalProcessed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
