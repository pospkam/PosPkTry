import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export const dynamic = 'force-dynamic';

const RegistrationSchema = z.object({
  route_name: z.string().min(1).max(200),
  route_description: z.string().max(2000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  region: z.string().max(200).default('Камчатский край'),
  group_size: z.number().int().min(1).max(30),
  group_members: z.array(z.object({
    name: z.string().max(120),
    phone: z.string().max(30).optional(),
    birth_year: z.number().int().optional(),
  })).optional(),
  leader_name: z.string().min(1).max(120),
  leader_phone: z.string().min(5).max(30),
  leader_email: z.string().email().optional().or(z.literal('')),
  emergency_contact_name: z.string().min(1).max(120),
  emergency_contact_phone: z.string().min(5).max(30),
  emergency_contact_relation: z.string().max(60).optional(),
  emergency_contact_telegram_chat_id: z.string().optional().or(z.literal('')),
  emergency_contact_email: z.string().email().optional().or(z.literal('')),
  emergency_contact_consent: z.boolean().default(false),
  accepted_disclaimer: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо принять условия' }),
  }),
});

function generateRegistrationPDF(data: z.infer<typeof RegistrationSchema>): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 60,
      font: 'Helvetica',
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Заголовок
    doc.fontSize(16).font('Helvetica-Bold').text('ЗАЯВЛЕНИЕ', { align: 'center' });
    doc.fontSize(12).text('о регистрации туристической группы', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text('в Главное управление МЧС России по Камчатскому краю', { align: 'center' });
    doc.moveDown(1);

    // Разделитель
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(0.5);

    const field = (label: string, value: string) => {
      doc.fontSize(10).font('Helvetica-Bold').text(label, { continued: true });
      doc.font('Helvetica').text(`  ${value || '—'}`);
    };

    field('Маршрут:', data.route_name);
    if (data.route_description) {
      doc.fontSize(10).font('Helvetica-Bold').text('Описание:', { continued: true });
      doc.font('Helvetica').text(`  ${data.route_description}`);
    }
    field('Регион:', data.region);
    field('Дата начала:', new Date(data.start_date).toLocaleDateString('ru-RU'));
    field('Дата окончания:', new Date(data.end_date).toLocaleDateString('ru-RU'));

    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(0.5);

    field('Руководитель:', data.leader_name);
    field('Телефон руководителя:', data.leader_phone);
    if (data.leader_email) field('Email:', data.leader_email);
    field('Количество участников:', String(data.group_size));

    if (data.group_members && data.group_members.length > 0) {
      doc.moveDown(0.3);
      doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('Состав группы:');
      data.group_members.forEach((m, i) => {
        const birthInfo = m.birth_year ? ` (${m.birth_year} г.р.)` : '';
        const phoneInfo = m.phone ? `, ${m.phone}` : '';
        doc.fontSize(10).text(`  ${i + 1}. ${m.name}${birthInfo}${phoneInfo}`);
      });
    }

    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(0.5);

    field('Экстренный контакт:', data.emergency_contact_name);
    field('Телефон:', data.emergency_contact_phone);
    if (data.emergency_contact_relation) {
      field('Кем приходится:', data.emergency_contact_relation);
    }

    // Подвал
    doc.moveDown(1.5);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).text(
      'Заявление сформировано автоматически через TourHab (tourhab.ru). ' +
      'Данная заявка не является подтверждением регистрации в МЧС. ' +
      'Для официальной регистрации подайте заявление через портал Госуслуг ' +
      'или лично в Главное управление МЧС России по Камчатскому краю.',
      { align: 'center' }
    );

    doc.fontSize(8).text(
      `Сформировано: ${new Date().toLocaleString('ru-RU')}`,
      { align: 'center' }
    );

    doc.end();
  });
}

/**
 * POST /api/safety/register
 * Создаёт регистрацию маршрута + возвращает PDF
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request).catch(() => ({
    isAuthenticated: false,
    userId: null,
    role: null,
  }));
  const userId = auth.isAuthenticated ? auth.userId : null;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = RegistrationSchema.safeParse(rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.errors[0]?.message },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Сохраняем в БД
  const result = await query(
    `INSERT INTO route_registrations
       (user_id, route_name, route_description, start_date, end_date, region,
        group_size, group_members, leader_name, leader_phone, leader_email,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        emergency_contact_telegram_chat_id, emergency_contact_email,
        emergency_contact_consent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [
      userId,
      data.route_name,
      data.route_description ?? null,
      data.start_date,
      data.end_date,
      data.region,
      data.group_size,
      data.group_members ? JSON.stringify(data.group_members) : null,
      data.leader_name,
      data.leader_phone,
      data.leader_email || null,
      data.emergency_contact_name,
      data.emergency_contact_phone,
      data.emergency_contact_relation ?? null,
      data.emergency_contact_telegram_chat_id ? BigInt(data.emergency_contact_telegram_chat_id) : null,
      data.emergency_contact_email || null,
      data.emergency_contact_consent,
    ]
  );

  const registrationId = result.rows[0].id as string;

  // Проверяем: клиент хочет PDF или просто сохранение
  const acceptHeader = request.headers.get('accept') || '';
  const wantPdf = acceptHeader.includes('application/pdf') ||
    request.nextUrl.searchParams.has('pdf');

  if (wantPdf) {
    const pdfBuffer = await generateRegistrationPDF(data);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tourhab-registration-${registrationId.slice(0, 8)}.pdf"`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    registration_id: registrationId,
    message: 'Маршрут зарегистрирован. Скачайте PDF-заявку и подайте в МЧС.',
  });
}
