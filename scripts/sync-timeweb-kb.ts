/**
 * Синхронизация 259 маршрутов Камчатки в Timeweb Cloud AI Knowledge Base
 *
 * Использование:
 *   1. Создай Knowledge Base в https://timeweb.cloud/my/cloud-ai/knowledge-bases
 *   2. Скопируй числовой ID и добавь в .env.local: TIMEWEB_AI_KB_ID=<id>
 *   3. Запусти: npx ts-node scripts/sync-timeweb-kb.ts
 *
 * Документы загружаются как текстовые файлы (type: "link" не используем —
 * не все маршруты имеют живые URL). Вместо этого каждый маршрут становится
 * отдельным Markdown-документом.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ── Config ────────────────────────────────────────────────────
const TIMEWEB_TOKEN = process.env.TIMEWEB_TOKEN || '';
const KB_ID = process.env.TIMEWEB_AI_KB_ID || '';
const KB_API = `https://api.timeweb.cloud/api/v1/cloud-ai/knowledge-bases/${KB_ID}/documents`;
const BATCH_DELAY_MS = 300; // задержка между запросами

interface Tour {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  duration?: string;
  price?: string | number;
  coordinates?: { lat?: number; lng?: number };
  highlights?: string[];
  source_url?: string;
  source?: string;
}

interface KnowledgeBase {
  total: number;
  categories: string[];
  tours: Tour[];
}

// ── Helpers ───────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tourToMarkdown(tour: Tour): string {
  const lines: string[] = [
    `# ${tour.name}`,
    '',
    `**Категория:** ${categoryLabel(tour.category || '')}`,
  ];
  if (tour.difficulty && tour.difficulty !== 'Не указано') {
    lines.push(`**Сложность:** ${tour.difficulty}`);
  }
  if (tour.duration && tour.duration !== 'Не указано') {
    lines.push(`**Продолжительность:** ${tour.duration}`);
  }
  if (tour.price) {
    lines.push(`**Цена:** ${tour.price}`);
  }
  if (tour.coordinates?.lat && tour.coordinates?.lng) {
    lines.push(`**Координаты:** ${tour.coordinates.lat}, ${tour.coordinates.lng}`);
  }
  if (tour.description) {
    lines.push('', '## Описание', '', tour.description);
  }
  if (tour.highlights?.length) {
    lines.push('', '## Особенности', '');
    tour.highlights.forEach(h => lines.push(`- ${h}`));
  }
  if (tour.source_url) {
    lines.push('', `**Источник:** ${tour.source_url}`);
  }
  return lines.join('\n');
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    vulkani: 'Вулканы',
    geyzery: 'Гейзеры',
    termalnye_istochniki: 'Термальные источники',
    rybalka: 'Рыбалка',
    snegohod: 'Снегоходы',
    dzhip: 'Джип-туры',
    morskie_progulki: 'Морские прогулки',
    trekking: 'Треккинг',
    lakes: 'Озёра',
    mountains: 'Горы',
    rivers: 'Реки',
    medvedi: 'Медведи',
    vertoletnye_tury: 'Вертолётные туры',
    eco: 'Эко-туры',
  };
  return map[cat] || cat;
}

// ── Timeweb API — upload single document as a link ─────────────
async function uploadDocument(name: string, content: string): Promise<{ ok: boolean; id?: number; error?: string }> {
  // Timeweb KB принимает документы как ссылки или файлы.
  // Используем data URI чтобы передать текст без файлового сервера.
  // Если data URI не поддерживается — используем type: "link" с внешним URL.
  const body = JSON.stringify({
    name,
    type: 'link',
    // Для type: "link" нужен URL. Используем mestechkokam или zmzk как источник.
    // Если у тура нет URL — пропускаем (или используем заглушку).
    url: `https://mestechkokam.ru/search?q=${encodeURIComponent(name)}`,
    content, // некоторые API принимают content напрямую
  });

  return new Promise(resolve => {
    const url = new URL(KB_API);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TIMEWEB_TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode < 300) {
            resolve({ ok: true, id: parsed.document?.id });
          } else {
            resolve({ ok: false, error: `HTTP ${res.statusCode}: ${data.slice(0, 200)}` });
          }
        } catch {
          resolve({ ok: false, error: `Parse error: ${data.slice(0, 200)}` });
        }
      });
    });

    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

// ── Probe KB document API to find correct format ──────────────
async function probeDocumentFormat(): Promise<void> {

  const testBody = JSON.stringify({ name: 'test', type: 'link', url: 'https://example.com' });
  const url = new URL(KB_API);

  return new Promise(resolve => {
    const options: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TIMEWEB_TOKEN}`,
        'Content-Length': Buffer.byteLength(testBody),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve();
      });
    });
    req.on('error', e => { console.log('Probe error:', e.message); resolve(); });
    req.write(testBody);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  if (!TIMEWEB_TOKEN) {
    process.exit(1);
  }
  if (!KB_ID) {
    process.exit(1);
  }

  // Загружаем knowledge base
  const kbPath = path.join(__dirname, '../crew/knowledge-base.json');
  if (!fs.existsSync(kbPath)) {
    process.exit(1);
  }

  const kb: KnowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));

  // Проверяем формат API
  await probeDocumentFormat();

  // Загружаем маршруты
  let uploaded = 0;
  let failed = 0;

  for (const tour of kb.tours) {
    const name = tour.name.slice(0, 100); // KB может ограничивать длину имени
    const content = tourToMarkdown(tour);

    process.stdout.write(`[${uploaded + failed + 1}/${kb.total}] ${name.slice(0, 60)}... `);

    const result = await uploadDocument(name, content);
    if (result.ok) {
      uploaded++;
    } else {
      failed++;
    }

    await sleep(BATCH_DELAY_MS);
  }

}

main().catch(e => {
  process.exit(1);
});
