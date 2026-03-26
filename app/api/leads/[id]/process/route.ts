/**
 * POST /api/leads/[id]/process
 *
 * Запускает AI Lead Processor для указанного лида:
 * квалификация → подбор туров → генерация предложения → сохранение в БД.
 *
 * Auth: requireOperator (admin + operator)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { leadProcessor } from '@/lib/services/lead-processor.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireOperator(req);
  if (authError instanceof NextResponse) return authError;

  const { id } = await params;

  try {
    const result = await leadProcessor.process(id);
    return NextResponse.json({ success: true, proposal: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обработки лида';
    const status = message.includes('не найден') ? 404
      : message.includes('уже') ? 409
      : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
