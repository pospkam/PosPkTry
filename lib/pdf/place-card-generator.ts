/**
 * lib/pdf/place-card-generator.ts
 *
 * Генерирует офлайн-карточку места: A4, чёрно-белый PDF.
 * Предназначен для скачивания перед выездом — работает без интернета.
 *
 * Содержит: название, тип, GPS, опасности, снаряжение, телефоны МЧС, QR-код.
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const HAZARD_LABELS: Record<string, string> = {
  avalanche:        'Лавины',
  rockfall:         'Камнепад',
  thermal:          'Термальные поля',
  altitude:         'Высокогорье (>2500м)',
  river_crossing:   'Переправы через реки',
  bears:            'Медведи',
  crevasses:        'Трещины/кратеры',
  volcanic_gas:     'Вулканические газы',
  flash_flood:      'Паводки',
  unstable_ground:  'Нестабильный грунт',
  weather:          'Резкая смена погоды',
  no_trail:         'Отсутствие тропы',
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  volcano:    'Вулкан',
  hot_spring: 'Термальный источник',
  geyser:     'Гейзер',
  lake:       'Озеро',
  mountain:   'Гора',
  cape:       'Мыс',
  bay:        'Бухта',
  beach:      'Пляж',
  river:      'Река',
  waterfall:  'Водопад',
  forest:     'Лесной массив',
  park:       'Природный парк',
  valley:     'Долина',
  pass:       'Перевал',
  plateau:    'Плато',
};

export interface PlaceCardData {
  id: string;
  name: string;
  locationType: string | null;
  lat: number;
  lng: number;
  zone: string | null;
  altitudeM: number | null;
  difficultyLevel: string | null;
  hazardTypes: string[] | null;
  requiredGear: string[] | null;
  openFromDate: string | null;
  openToDate: string | null;
  registrationRequired: boolean | null;
  phoneRangerMches: string | null;
  nearestMedicalKm: number | null;
  satCommunicatorRequired: boolean | null;
  description: string | null;
}

async function buildQRCodeBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 160,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

export async function generatePlaceCardPDF(place: PlaceCardData): Promise<Buffer> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  const pageUrl = `${appUrl}/places/${place.id}`;
  const qrBuffer = await buildQRCodeBuffer(pageUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 48, left: 52, right: 52 },
      info: {
        Title: `${place.name} — офлайн карточка`,
        Author: 'TourHab — Камчатка',
        Subject: 'Офлайн карточка места',
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 104; // printable width
    const typeLabel = place.locationType
      ? (LOCATION_TYPE_LABELS[place.locationType] ?? place.locationType.toUpperCase())
      : 'МЕСТО';

    // ── Заголовок ─────────────────────────────────────────────────────────────

    doc.rect(0, 0, doc.page.width, 72).fill('#1A1714');

    doc.fillColor('#FFFFFF')
       .fontSize(9)
       .font('Helvetica')
       .text('TOURHAB · КАМЧАТКА', 52, 20, { characterSpacing: 2 });

    doc.fontSize(8)
       .text('ОФЛАЙН КАРТОЧКА МЕСТА', 0, 20, { align: 'right', width: doc.page.width - 52 });

    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(place.name, 52, 36);

    doc.moveDown(0);

    // ── Тип + зона ────────────────────────────────────────────────────────────

    let y = 88;

    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(typeLabel.toUpperCase(), 52, y, { characterSpacing: 1.5 });

    if (place.zone) {
      doc.fillColor('#444444')
         .font('Helvetica')
         .text(` · ${place.zone}`, { continued: false });
    }

    y = doc.y + 10;

    // ── Горизонтальная линия ──────────────────────────────────────────────────

    doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(52, y).lineTo(52 + W, y).stroke();
    y += 14;

    // ── GPS координаты (крупно) ───────────────────────────────────────────────

    doc.fillColor('#000000')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('GPS КООРДИНАТЫ', 52, y, { characterSpacing: 1 });
    y = doc.y + 4;

    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text(`${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`, 52, y);
    y = doc.y + 4;

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#444444')
       .text('Скопируй в Organic Maps / Google Maps для навигации без интернета', 52, y);
    y = doc.y + 16;

    if (place.altitudeM) {
      doc.fontSize(9).font('Helvetica').fillColor('#000000')
         .text(`Высота: ${place.altitudeM} м н.у.м.`, 52, y);
      y = doc.y + 10;
    }

    // ── Разделитель ───────────────────────────────────────────────────────────

    doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(52, y).lineTo(52 + W, y).stroke();
    y += 14;

    // ── Опасности ─────────────────────────────────────────────────────────────

    if (place.hazardTypes && place.hazardTypes.length > 0) {
      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('ОПАСНОСТИ', 52, y, { characterSpacing: 1 });
      y = doc.y + 6;

      for (const h of place.hazardTypes) {
        const label = HAZARD_LABELS[h] ?? h;
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`• ${label}`, 60, y);
        y = doc.y + 2;
      }
      y = doc.y + 10;
    }

    // ── Снаряжение ────────────────────────────────────────────────────────────

    if (place.requiredGear && place.requiredGear.length > 0) {
      doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(52, y).lineTo(52 + W, y).stroke();
      y += 14;

      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('НЕОБХОДИМОЕ СНАРЯЖЕНИЕ', 52, y, { characterSpacing: 1 });
      y = doc.y + 6;

      const gearCols: string[][] = [[], []];
      place.requiredGear.forEach((g, i) => gearCols[i % 2].push(g));

      const colW = (W - 10) / 2;
      const leftGear  = gearCols[0].map(g => `• ${g}`).join('\n');
      const rightGear = gearCols[1].map(g => `• ${g}`).join('\n');
      const gearY = y;

      if (leftGear) {
        doc.fontSize(9).font('Helvetica').fillColor('#000000')
           .text(leftGear, 60, gearY, { width: colW });
      }
      if (rightGear) {
        doc.fontSize(9).font('Helvetica').fillColor('#000000')
           .text(rightGear, 60 + colW + 10, gearY, { width: colW });
      }

      y = Math.max(doc.y, gearY + (gearCols[0].length * 14)) + 10;
    }

    // ── Сезон / контрольный срок ──────────────────────────────────────────────

    if (place.openFromDate || place.openToDate) {
      doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(52, y).lineTo(52 + W, y).stroke();
      y += 14;

      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('СЕЗОН ПОСЕЩЕНИЯ', 52, y, { characterSpacing: 1 });
      y = doc.y + 6;

      const from = place.openFromDate ?? '—';
      const to   = place.openToDate   ?? '—';
      doc.fontSize(10).font('Helvetica').fillColor('#000000')
         .text(`${from} — ${to}`, 60, y);
      y = doc.y + 10;
    }

    if (place.registrationRequired) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
         .text('! Требуется регистрация в МЧС перед выходом', 52, y);
      y = doc.y + 10;
    }

    // ── Экстренные контакты ───────────────────────────────────────────────────

    doc.strokeColor('#000000').lineWidth(1).moveTo(52, y).lineTo(52 + W, y).stroke();
    y += 14;

    doc.fillColor('#000000')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('ЭКСТРЕННЫЕ КОНТАКТЫ', 52, y, { characterSpacing: 1 });
    y = doc.y + 6;

    // 112
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000').text('112', 60, y);
    doc.fontSize(9).font('Helvetica').fillColor('#444444').text('Единый экстренный', 60, doc.y + 2);

    const col2x = 52 + W / 2;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
       .text(place.phoneRangerMches ?? '+7-4152-41-11-11', col2x, y);
    doc.fontSize(9).font('Helvetica').fillColor('#444444')
       .text('МЧС Камчатки', col2x, doc.y + 2);

    y = doc.y + 16;

    if (place.satCommunicatorRequired) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
         .text('! Рекомендуется спутниковый коммуникатор', 52, y);
      y = doc.y + 6;
    }

    if (place.nearestMedicalKm) {
      doc.fontSize(9).font('Helvetica').fillColor('#000000')
         .text(`До ближайшей медпомощи: ${place.nearestMedicalKm} км`, 52, y);
      y = doc.y + 10;
    }

    // ── QR-код ────────────────────────────────────────────────────────────────

    const qrSize = 110;
    const qrX = doc.page.width - 52 - qrSize;
    const qrY = doc.page.height - 48 - qrSize - 20;

    doc.image(qrBuffer, qrX, qrY, { width: qrSize });
    doc.fontSize(7).font('Helvetica').fillColor('#444444')
       .text('Актуальная версия страницы', qrX, qrY + qrSize + 4, { width: qrSize, align: 'center' });

    // ── Описание (если осталось место) ────────────────────────────────────────

    const descMaxY = qrY - 10;
    if (place.description && y < descMaxY - 40) {
      doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(52, y).lineTo(52 + W, y).stroke();
      y += 14;

      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold')
         .text('О МЕСТЕ', 52, y, { characterSpacing: 1 });
      y = doc.y + 6;

      const maxDescLen = 600;
      const desc = place.description.length > maxDescLen
        ? place.description.slice(0, maxDescLen) + '...'
        : place.description;

      doc.fontSize(9).font('Helvetica').fillColor('#333333')
         .text(desc, 52, y, { width: W - qrSize - 20, lineGap: 2 });
    }

    // ── Подвал ────────────────────────────────────────────────────────────────

    const footerY = doc.page.height - 48;
    doc.strokeColor('#CCCCCC').lineWidth(0.5)
       .moveTo(52, footerY - 10).lineTo(52 + W, footerY - 10).stroke();

    doc.fontSize(7).font('Helvetica').fillColor('#888888')
       .text(
         `Сгенерировано: ${new Date().toLocaleDateString('ru-RU')} · tourhab.ru · ${pageUrl}`,
         52, footerY,
         { width: W - qrSize - 20 },
       );

    doc.end();
  });
}
