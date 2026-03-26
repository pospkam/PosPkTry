/**
 * Генератор PDF-предложений для туристов.
 * Использует PDFKit (чистый Node.js, без браузера).
 *
 * Структура PDF:
 *   — Шапка: логотип TourHab + дата
 *   — Заголовок: персонализированный headline
 *   — Секция "Для вас подобрали": summary
 *   — Highlights: 4 ключевых преимущества
 *   — Основной тур: название, цена, длительность, описание
 *   — Альтернативы (если есть)
 *   — Подвал: контакты + QR-like info
 */

import PDFDocument from 'pdfkit';
import type { LeadProposalData } from '@/lib/services/lead-processor.service';

interface GenerateOptions {
  clientName: string;
  proposal: LeadProposalData;
}

export async function generateProposalPDF(opts: GenerateOptions): Promise<Buffer> {
  const { clientName, proposal } = opts;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: proposal.headline,
        Author: 'TourHab — Камчатка',
        Subject: `Персональное предложение для ${clientName}`,
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_WIDTH  = doc.page.width - 120;   // с учётом margins
    const ACCENT      = '#D44A0C';
    const OCEAN       = '#2568B0';
    const TEXT_MAIN   = '#1A1714';
    const TEXT_MUTED  = '#6B6560';
    const BG_LIGHT    = '#F5F0EB';

    // ── Шапка ─────────────────────────────────────────────────────────────────

    // Фоновая полоса шапки
    doc.rect(0, 0, doc.page.width, 90).fill(ACCENT);

    doc.fillColor('#FFFFFF')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('TourHab', 60, 28);

    doc.fontSize(10)
       .font('Helvetica')
       .text('Туристическая платформа Камчатки', 60, 54);

    const dateStr = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.fontSize(10)
       .text(dateStr, 60, 54, { align: 'right', width: PAGE_WIDTH });

    doc.moveDown(3);

    // ── Персональный заголовок ────────────────────────────────────────────────

    doc.fillColor(ACCENT)
       .fontSize(9)
       .font('Helvetica')
       .text('ПЕРСОНАЛЬНОЕ ПРЕДЛОЖЕНИЕ', { characterSpacing: 2 });

    doc.fillColor(TEXT_MAIN)
       .fontSize(20)
       .font('Helvetica-Bold')
       .text(proposal.headline, { lineGap: 4 });

    doc.moveDown(0.4);

    doc.fillColor(TEXT_MUTED)
       .fontSize(10)
       .font('Helvetica')
       .text(`Подготовлено специально для ${clientName}`, { lineGap: 2 });

    doc.moveDown(1);

    // ── Разделитель ───────────────────────────────────────────────────────────

    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y)
       .strokeColor(ACCENT).lineWidth(2).stroke();

    doc.moveDown(1);

    // ── Summary ───────────────────────────────────────────────────────────────

    doc.fillColor(TEXT_MAIN)
       .fontSize(11)
       .font('Helvetica')
       .text(proposal.summary, { lineGap: 4, paragraphGap: 6 });

    doc.moveDown(1.2);

    // ── Highlights ────────────────────────────────────────────────────────────

    doc.fillColor(TEXT_MAIN)
       .fontSize(13)
       .font('Helvetica-Bold')
       .text('Ключевые преимущества');

    doc.moveDown(0.5);

    const highlights = Array.isArray(proposal.highlights)
      ? proposal.highlights
      : [];

    for (const h of highlights) {
      const startY = doc.y;
      // Цветной маркер
      doc.rect(60, startY + 3, 8, 8).fill(ACCENT);
      doc.fillColor(TEXT_MAIN)
         .fontSize(11)
         .font('Helvetica')
         .text(h, 76, startY, { width: PAGE_WIDTH - 16, lineGap: 2 });
      doc.moveDown(0.3);
    }

    doc.moveDown(1);

    // ── Основной тур ──────────────────────────────────────────────────────────

    if (proposal.primary_tour) {
      const t = proposal.primary_tour;
      const boxY = doc.y;

      // Фон карточки
      doc.rect(58, boxY - 8, PAGE_WIDTH + 4, 130).fill(BG_LIGHT);

      doc.fillColor(ACCENT)
         .fontSize(9)
         .font('Helvetica')
         .text('РЕКОМЕНДУЕМЫЙ ТУР', 68, boxY + 4, { characterSpacing: 1.5 });

      doc.fillColor(TEXT_MAIN)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(t.title, 68, boxY + 18, { width: PAGE_WIDTH - 20 });

      // Цена + длительность
      doc.fillColor(ACCENT)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(`${t.price.toLocaleString('ru-RU')} ₽/чел`, 68, boxY + 40);

      doc.fillColor(TEXT_MUTED)
         .fontSize(10)
         .font('Helvetica')
         .text(`${t.duration_days} дн. · ${formatActivity(t.activity_type)}`, 68, boxY + 62);

      if (t.description) {
        doc.fillColor(TEXT_MAIN)
           .fontSize(10)
           .font('Helvetica')
           .text(t.description.slice(0, 200) + (t.description.length > 200 ? '...' : ''),
             68, boxY + 80, { width: PAGE_WIDTH - 20, lineGap: 2 });
      }

      doc.y = boxY + 138;
      doc.moveDown(1);
    }

    // ── Альтернативные туры ───────────────────────────────────────────────────

    if (proposal.alt_tours.length > 0) {
      doc.fillColor(TEXT_MAIN)
         .fontSize(13)
         .font('Helvetica-Bold')
         .text('Также рассмотрите');

      doc.moveDown(0.5);

      for (const t of proposal.alt_tours) {
        doc.fillColor(OCEAN)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(`${t.title}`, { continued: true })
           .fillColor(TEXT_MUTED)
           .font('Helvetica')
           .fontSize(10)
           .text(`  —  ${t.price.toLocaleString('ru-RU')} ₽ · ${t.duration_days} дн.`);
        doc.moveDown(0.3);
      }
      doc.moveDown(0.5);
    }

    // ── Цены ──────────────────────────────────────────────────────────────────

    if (proposal.price_from) {
      doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y)
         .strokeColor('#E5E0DB').lineWidth(1).stroke();
      doc.moveDown(0.8);

      doc.fillColor(TEXT_MUTED).fontSize(10).font('Helvetica')
         .text('Стоимость туров', { continued: true });
      doc.fillColor(TEXT_MAIN).font('Helvetica-Bold').fontSize(12)
         .text(
           `  от ${proposal.price_from.toLocaleString('ru-RU')} ₽` +
           (proposal.price_to && proposal.price_to !== proposal.price_from
             ? ` до ${proposal.price_to.toLocaleString('ru-RU')} ₽`
             : '') + ' / чел.'
         );
      doc.moveDown(1);
    }

    // ── Подвал ────────────────────────────────────────────────────────────────

    // Прыгаем к низу страницы
    const footerY = doc.page.height - 80;
    doc.rect(0, footerY - 10, doc.page.width, 90).fill(TEXT_MAIN);

    doc.fillColor('#FFFFFF')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('TourHab — Туризм на Камчатке', 60, footerY);

    doc.fillColor('#9A9590')
       .fontSize(9)
       .font('Helvetica')
       .text('tourhab.ru · Предложение действительно 7 дней', 60, footerY + 18);

    doc.fillColor('#9A9590')
       .fontSize(8)
       .text('Для подтверждения бронирования свяжитесь с менеджером или перейдите на сайт.', 60, footerY + 36, {
         width: PAGE_WIDTH,
       });

    doc.end();
  });
}

function formatActivity(type: string): string {
  const labels: Record<string, string> = {
    trekking:     'Треккинг',
    volcano:      'Восхождение',
    fishing:      'Рыбалка',
    thermal:      'Термальный отдых',
    helicopter:   'Вертолётная экскурсия',
    boat_trip:    'Морская прогулка',
    snowmobile:   'Снегоходы',
    skiing:       'Лыжи / скитур',
    diving:       'Дайвинг',
    kayak:        'Байдарки',
    horseback:    'Конный маршрут',
    birdwatching: 'Орнитология',
    photography:  'Фотоохота',
    other:        'Активный отдых',
  };
  return labels[type] ?? type;
}
