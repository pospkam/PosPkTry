/**
 * Генератор PDF: Маршрутная квитанция / Туристический ваучер.
 * Составлен AI Юристом TourHab (апрель 2026).
 */

import PDFDocument from 'pdfkit';

export interface VoucherData {
  bookingId: number;
  issueDate: string;
  touristName: string;
  touristPhone: string;
  touristEmail?: string;
  paxCount: number;
  tourName: string;
  tourDate: string;
  tourDuration: string;
  meetingPoint?: string;
  meetingDescription?: string;
  whatToBring?: string;
  totalPrice: number;
  paymentStatus: string;
  paymentDate?: string;
  operatorName: string;
  operatorPhone?: string;
  operatorTelegram?: string;
  operatorEmail?: string;
}

export async function generateVoucherPDF(data: VoucherData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 45, bottom: 45, left: 50, right: 50 },
      info: {
        Title: `Ваучер №${data.bookingId}`,
        Author: 'TourHab — Камчатка',
        Subject: `Тур: ${data.tourName}`,
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W      = doc.page.width - 100;
    const ACCENT = '#D44A0C';
    const OCEAN  = '#2568B0';
    const DARK   = '#1A1714';
    const MUTED  = '#6B6560';
    const LINE   = '#E8E3DE';
    const GREEN  = '#3FB950';

    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const money = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

    // ── Шапка ─────────────────────────────────────────────────────────────────
    doc.rect(50, 40, W, 52).fill('#F5F0EB');
    doc.fontSize(18).font('Helvetica-Bold').fillColor(ACCENT)
       .text('TourHab', 65, 52, { continued: true })
       .fontSize(9).font('Helvetica').fillColor(MUTED)
       .text('  Туристическая платформа Камчатки · tourhab.ru');
    doc.fontSize(9).font('Helvetica').fillColor(MUTED)
       .text('МАРШРУТНАЯ КВИТАНЦИЯ / ТУРИСТИЧЕСКИЙ ВАУЧЕР', 65, 74);
    doc.y = 100;
    doc.moveDown(0.6);

    // ── Номер и даты ──────────────────────────────────────────────────────────
    doc.fontSize(22).font('Helvetica-Bold').fillColor(DARK)
       .text(`Бронь №${data.bookingId}`, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED)
       .text(`Выдан: ${fmt(data.issueDate)}   ·   Действителен до: ${fmt(data.tourDate)}`, { align: 'center' });
    doc.moveDown(0.8);

    // ── Статус оплаты ─────────────────────────────────────────────────────────
    const paid = data.paymentStatus === 'paid';
    const statusColor = paid ? GREEN : '#D29922';
    const statusText  = paid ? `ОПЛАЧЕНО · ${money(data.totalPrice)}` : `К ОПЛАТЕ · ${money(data.totalPrice)}`;
    doc.rect(50, doc.y, W, 28).fill(paid ? '#3FB95015' : '#D2992215');
    doc.fontSize(11).font('Helvetica-Bold').fillColor(statusColor)
       .text(statusText, 50, doc.y + 8, { align: 'center', width: W });
    doc.y += 36;
    doc.moveDown(0.8);

    // ── Турист ────────────────────────────────────────────────────────────────
    divider(doc, LINE, W);
    blockTitle(doc, 'ДАННЫЕ ТУРИСТА', OCEAN);
    twoCol(doc, DARK, MUTED, W, [
      ['ФИО',         data.touristName],
      ['Телефон',     data.touristPhone],
      ['E-mail',      data.touristEmail ?? '—'],
      ['Участников',  `${data.paxCount} чел.`],
    ]);
    doc.moveDown(0.8);

    // ── Тур ──────────────────────────────────────────────────────────────────
    divider(doc, LINE, W);
    blockTitle(doc, 'ТУР', OCEAN);
    twoCol(doc, DARK, MUTED, W, [
      ['Название',         data.tourName],
      ['Дата',             fmt(data.tourDate)],
      ['Продолжительность',data.tourDuration],
      ['Место сбора',      data.meetingPoint ?? 'уточняйте у оператора'],
    ]);
    if (data.meetingDescription) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor(MUTED)
         .text(data.meetingDescription, { width: W, indent: 10 });
    }
    doc.moveDown(0.8);

    // ── Оператор ──────────────────────────────────────────────────────────────
    divider(doc, LINE, W);
    blockTitle(doc, 'ОПЕРАТОР ТУРА', OCEAN);
    twoCol(doc, DARK, MUTED, W, [
      ['Компания',  data.operatorName],
      ['Телефон',   data.operatorPhone ?? '—'],
      ['Telegram',  data.operatorTelegram ?? '—'],
      ['E-mail',    data.operatorEmail ?? '—'],
    ]);
    doc.moveDown(0.8);

    // ── Инструкции ────────────────────────────────────────────────────────────
    divider(doc, LINE, W);
    blockTitle(doc, 'ВАЖНЫЕ ИНСТРУКЦИИ', OCEAN);

    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text('Что взять с собой:');
    doc.font('Helvetica').fillColor(MUTED).fontSize(9).text(
      data.whatToBring ??
      'Треккинговая обувь, тёплые слои одежды, дождевик, личные документы, ' +
      'вода (1–2 л), солнцезащитный крем, полный заряд телефона.',
      { width: W, indent: 10 }
    );
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text('Как нас найти:');
    doc.font('Helvetica').fillColor(MUTED).text(
      'Покажите этот ваучер гиду на месте сбора. При себе иметь документ, удостоверяющий личность.',
      { width: W, indent: 10 }
    );
    doc.moveDown(0.5);

    // Экстренные контакты
    doc.rect(50, doc.y, W, 44).fill('#DC262608');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#DC2626')
       .text('ЭКСТРЕННЫЕ КОНТАКТЫ', 65, doc.y + 6);
    doc.font('Helvetica').fillColor(MUTED).fontSize(9)
       .text(
         `Единая служба спасения: 112   ·   МЧС Камчатки: +7 (4152) 41-00-01   ·   Оператор: ${data.operatorPhone ?? '—'}`,
         65, doc.y + 20, { width: W - 20 }
       );
    doc.y += 52;
    doc.moveDown(0.8);

    // ── Ссылка ────────────────────────────────────────────────────────────────
    divider(doc, LINE, W);
    doc.moveDown(0.4);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(
      `Детали бронирования: tourhab.ru/booking-success/${data.bookingId}`,
      { align: 'center', width: W }
    );
    doc.moveDown(0.3);

    // ── Подвал ─────────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor(MUTED).text(
      `Ваучер №${data.bookingId} · TourHab (tourhab.ru) · support@tourhab.ru · ${fmt(data.issueDate)}`,
      { align: 'center', width: W }
    );

    doc.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function divider(doc: PDFKit.PDFDocument, color: string, w: number) {
  doc.moveTo(50, doc.y).lineTo(50 + w, doc.y).strokeColor(color).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

function blockTitle(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor(color).text(title);
  doc.moveDown(0.3);
}

function twoCol(
  doc: PDFKit.PDFDocument, dark: string, muted: string, w: number,
  rows: [string, string][],
) {
  for (const [label, value] of rows) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(dark)
       .text(label + ':', 50, doc.y, { continued: true, width: 120 })
       .font('Helvetica').fillColor(muted).text(value, { width: w - 120 });
    doc.moveDown(0.2);
  }
}
