/**
 * GET /api/leads/[id]/proposal/pdf
 *
 * Генерирует PDF-предложение для клиента на лету с помощью PDFKit.
 * Возвращает бинарный поток с Content-Type: application/pdf.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { leadProcessor } from '@/lib/services/lead-processor.service';
import { generateProposalPDF } from '@/lib/pdf/proposal-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOperator(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  const { rows } = await pool.query<{ proposal_id: string | null; name: string }>(
    `SELECT proposal_id, name FROM leads WHERE id = $1`,
    [id]
  );

  if (!rows[0]) {
    return NextResponse.json({ error: 'Лид не найден' }, { status: 404 });
  }

  if (!rows[0].proposal_id) {
    return NextResponse.json({ error: 'Предложение не сформировано' }, { status: 404 });
  }

  const proposal = await leadProcessor.getProposal(rows[0].proposal_id);
  if (!proposal) {
    return NextResponse.json({ error: 'Предложение не найдено' }, { status: 404 });
  }

  const pdfBytes = await generateProposalPDF({
    clientName: rows[0].name,
    proposal,
  });

  const safeName = rows[0].name.replace(/[^\w\u0400-\u04FF -]/g, '').replace(/\s+/g, '-').slice(0, 50);
  const filename = `proposal-${safeName}-${Date.now()}.pdf`;

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdfBytes.length),
    },
  });
}
