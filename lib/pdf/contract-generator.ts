/**
 * Генератор PDF: Договор об оказании туристических услуг.
 * Составлен AI Юристом TourHab (апрель 2026).
 * Основание: ФЗ №132-ФЗ, ГК РФ, ФЗ №152-ФЗ, ЗоЗПП.
 */

import PDFDocument from 'pdfkit';

export interface ContractData {
  bookingId: number;
  issueDate: string;           // ISO date
  touristName: string;
  touristPhone: string;
  touristEmail?: string;
  tourName: string;
  tourDate: string;            // ISO date
  tourDuration: string;        // e.g. "3 дня"
  meetingPoint?: string;
  paxCount: number;
  totalPrice: number;
  paymentDate?: string;
  paymentStatus: string;
  operatorName: string;
  operatorPhone?: string;
  operatorEmail?: string;
  operatorInn?: string;
}

export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 55, right: 55 },
      info: {
        Title: `Договор №${data.bookingId}`,
        Author: 'TourHab — Камчатка',
        Subject: `Туристические услуги: ${data.tourName}`,
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W      = doc.page.width - 110;
    const ACCENT = '#D44A0C';
    const DARK   = '#1A1714';
    const MUTED  = '#6B6560';
    const LINE   = '#E8E3DE';

    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const money = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

    // ── Шапка ──────────────────────────────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').fillColor(ACCENT)
       .text('TourHab', { continued: true })
       .font('Helvetica').fillColor(MUTED).fontSize(10)
       .text('  tourhab.ru', { align: 'left' });

    doc.moveDown(0.3);
    doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor(LINE).lineWidth(1).stroke();
    doc.moveDown(0.8);

    // ── Заголовок ──────────────────────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK)
       .text('ДОГОВОР ОБ ОКАЗАНИИ ТУРИСТИЧЕСКИХ УСЛУГ', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor(MUTED)
       .text(`№ ${data.bookingId}  от  ${fmt(data.issueDate)}`, { align: 'center' });
    doc.moveDown(1);

    // ── Стороны ────────────────────────────────────────────────────────────────
    section(doc, 'СТОРОНЫ', ACCENT);

    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Исполнитель: ', { continued: true })
       .font('Helvetica').text(`${data.operatorName}, платформа TourHab (tourhab.ru)`);
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').text('Заказчик: ', { continued: true })
       .font('Helvetica').text(`${data.touristName}, тел. ${data.touristPhone}${data.touristEmail ? ', ' + data.touristEmail : ''}`);
    doc.moveDown(1);

    // ── 1. Предмет ─────────────────────────────────────────────────────────────
    section(doc, '1. ПРЕДМЕТ ДОГОВОРА', ACCENT);
    rows(doc, DARK, MUTED, [
      ['Тур',             data.tourName],
      ['Дата проведения', fmt(data.tourDate)],
      ['Продолжительность', data.tourDuration],
      ['Место сбора',     data.meetingPoint ?? 'уточняется у оператора'],
      ['Участников',      String(data.paxCount) + ' чел.'],
    ]);
    doc.moveDown(1);

    // ── 2. Стоимость ───────────────────────────────────────────────────────────
    section(doc, '2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ', ACCENT);
    rows(doc, DARK, MUTED, [
      ['Стоимость',    money(data.totalPrice)],
      ['Статус',       data.paymentStatus === 'paid' ? 'Оплачено ✓' : 'Ожидает оплаты'],
      ['Дата оплаты',  data.paymentDate ? fmt(data.paymentDate) : '—'],
      ['Способ',       'CloudPayments (банковская карта)'],
    ]);
    doc.moveDown(0.6);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED)
       .text('Договор вступает в силу с момента получения подтверждения оплаты.', { width: W });
    doc.moveDown(1);

    // ── 3. Права и обязанности ─────────────────────────────────────────────────
    section(doc, '3. ПРАВА И ОБЯЗАННОСТИ СТОРОН', ACCENT);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Исполнитель обязан:');
    bullets(doc, MUTED, W, [
      'провести тур согласно программе;',
      'обеспечить безопасность участников в рамках своей ответственности;',
      'предоставить снаряжение согласно описанию тура;',
      'заблаговременно уведомить о существенных изменениях.',
    ]);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fillColor(DARK).text('Заказчик обязан:');
    bullets(doc, MUTED, W, [
      'прибыть на место сбора в назначенное время;',
      'выполнять инструкции гида и правила безопасности;',
      'сообщить оператору об ограничениях здоровья, влияющих на участие.',
    ]);
    doc.moveDown(1);

    // ── 4. Ответственность ─────────────────────────────────────────────────────
    section(doc, '4. ОТВЕТСТВЕННОСТЬ СТОРОН', ACCENT);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(
      'Исполнитель несёт ответственность за качество услуг согласно ГК РФ, ФЗ №132-ФЗ и ЗоЗПП. ' +
      'Исполнитель не отвечает за природные явления и форс-мажор (п. 5.4). ' +
      'Заказчик самостоятельно отвечает за своё здоровье и страхование. ' +
      'Рекомендуется оформить туристическую страховку до начала тура.',
      { width: W }
    );
    doc.moveDown(1);

    // ── 5. Отмена и возврат ────────────────────────────────────────────────────
    section(doc, '5. УСЛОВИЯ ОТМЕНЫ И ВОЗВРАТА', ACCENT);
    bullets(doc, MUTED, W, [
      'Более 30 дней до тура — возврат 100%',
      'От 14 до 30 дней — возврат 50%',
      'Менее 14 дней — возврат не производится',
      'Форс-мажор (извержение, штормовое предупреждение МЧС, закрытие маршрута) — возврат 100%',
      'Отмена по инициативе Исполнителя (не форс-мажор) — возврат 100% в течение 10 р.д.',
    ]);
    doc.moveDown(0.4);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED)
       .text('Возврат на карту оплаты в срок до 10 рабочих дней.', { width: W });
    doc.moveDown(1);

    // ── 6. Персональные данные ─────────────────────────────────────────────────
    section(doc, '6. ПЕРСОНАЛЬНЫЕ ДАННЫЕ', ACCENT);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(
      'Заказчик даёт согласие на обработку персональных данных в целях исполнения Договора ' +
      '(ФЗ №152-ФЗ). Данные не передаются третьим лицам, кроме случаев, необходимых для ' +
      'проведения тура (транспорт, страхование, МЧС).',
      { width: W }
    );
    doc.moveDown(1);

    // ── 7. Прочие условия ─────────────────────────────────────────────────────
    section(doc, '7. ПРОЧИЕ УСЛОВИЯ', ACCENT);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(
      'Договор регулируется законодательством РФ. Споры — в претензионном порядке, ' +
      'срок ответа 10 р.д., при недостижении согласия — в суде по месту Исполнителя. ' +
      'Договор акцептован Заказчиком в электронной форме на платформе TourHab в момент ' +
      'подтверждения бронирования (ГК РФ, ст. 438).',
      { width: W }
    );
    doc.moveDown(1);

    // ── Реквизиты ─────────────────────────────────────────────────────────────
    section(doc, 'РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ', ACCENT);
    rows(doc, DARK, MUTED, [
      ['Наименование', data.operatorName],
      ['ИНН / ОГРНИП', data.operatorInn ?? 'уточняйте у оператора'],
      ['Телефон',      data.operatorPhone ?? '—'],
      ['E-mail',       data.operatorEmail ?? '—'],
    ]);
    doc.moveDown(1);

    // ── Подвал ─────────────────────────────────────────────────────────────────
    doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor(MUTED)
       .text(`Договор №${data.bookingId} сформирован автоматически платформой TourHab (tourhab.ru) · ${fmt(data.issueDate)}`, { align: 'center', width: W });

    doc.end();
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function section(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor(color).text(title);
  doc.moveDown(0.4);
}

function rows(doc: PDFKit.PDFDocument, dark: string, muted: string, data: [string, string][]) {
  for (const [label, value] of data) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(dark)
       .text(label + ': ', { continued: true })
       .font('Helvetica').fillColor(muted).text(value);
    doc.moveDown(0.2);
  }
}

function bullets(doc: PDFKit.PDFDocument, color: string, width: number, items: string[]) {
  for (const item of items) {
    doc.fontSize(9).font('Helvetica').fillColor(color)
       .text(`• ${item}`, { width, indent: 10 });
    doc.moveDown(0.15);
  }
}
