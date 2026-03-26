/**
 * POST /api/leads/process
 *
 * Запускает AI Lead Processor для одного лида.
 * После обработки — авто-уведомление оператора в Telegram.
 *
 * Body: { lead_id: string }
 * Auth: requireAdmin (admin/operator)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOperator } from '@/lib/auth/middleware';
import { leadProcessor } from '@/lib/services/lead-processor.service';
import { notifyOperatorProposal } from '@/lib/notifications/lead-notify';

const Schema = z.object({
  lead_id: z.string().uuid('Неверный формат ID лида'),
});

export async function POST(req: NextRequest) {
  const authResult = await requireOperator(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  const parse = Schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.issues[0]?.message ?? 'Ошибка валидации' },
      { status: 422 }
    );
  }

  const { lead_id } = parse.data;

  try {
    const proposal = await leadProcessor.process(lead_id);

    // Авто-уведомление оператора в Telegram (не блокирует ответ)
    notifyOperatorProposal(proposal).catch(() => undefined);

    return NextResponse.json({
      success: true,
      proposal_id:   proposal.proposal_id,
      headline:      proposal.headline,
      ai_score:      proposal.ai_score,
      tours_matched: (proposal.primary_tour ? 1 : 0) + proposal.alt_tours.length,
      generation_ms: proposal.generation_ms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обработки лида';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
