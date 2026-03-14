/**
 * Обогащение базы знаний из topkam.ru
 * Источник: topkam.ru — архив Камчатинтура, кладезь описаний локаций
 *
 * Что делает:
 *   1. Скрейпит страницы локаций с topkam.ru/attractions/
 *   2. Матчит с agent_route_knowledge по названию
 *   3. UPDATE description WHERE пусто или короткое
 *   4. Обновляет scripts/kb-docs/*.md богатым контентом
 *
 * Использование:
 *   node scripts/enrich-from-topkam.js              — всё
 *   node scripts/enrich-from-topkam.js --dry-run    — только покажи, не пиши в БД
 *   node scripts/enrich-from-topkam.js --kb-only    — только обновить kb-docs
 */

const { Pool } = require('pg');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// ── ENV ────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
    for (const line of data.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* нет .env.local */ }
}
loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');
const KB_ONLY = process.argv.includes('--kb-only');
const BASE_URL = 'https://www.topkam.ru';
const DELAY_MS = 800; // вежливая пауза между запросами

// ── Карта категорий topkam → наши slug'и ────────────────────
const ATTRACTION_CATEGORIES = [
  { url: '/attractions/volcanos/',        slug: 'vulkani',              label: 'Вулканы'          },
  { url: '/attractions/special_places/',  slug: 'geyzery',              label: 'Уникальные места' },
  { url: '/attractions/lakes/',           slug: 'lakes',                label: 'Озёра'            },
  { url: '/attractions/rivers/',          slug: 'rivers',               label: 'Реки'             },
  { url: '/attractions/waterfalls/',      slug: 'trekking',             label: 'Водопады'         },
  { url: '/attractions/islands/',         slug: 'morskie_progulki',     label: 'Острова'          },
  { url: '/attractions/mountains/',       slug: 'mountains',            label: 'Горы'             },
  { url: '/attractions/springs/',         slug: 'termalnye_istochniki', label: 'Источники'        },
];

// ── Утилиты ───────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TourHab-enricher/1.0; +https://tourhab.ru)',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.warn(`  Ошибка fetch ${url}: ${e.message}`);
    return null;
  }
}

function extractLinks(html, baseUrl, filterPath) {
  const dom = new JSDOM(html);
  const links = [...dom.window.document.querySelectorAll('a[href]')]
    .map(a => a.getAttribute('href'))
    .filter(href => href && href.includes(filterPath) && href.endsWith('.html'))
    .map(href => href.startsWith('http') ? href : baseUrl + href)
    .filter((v, i, a) => a.indexOf(v) === i); // уникальные
  return links;
}

function extractAttractionContent(html, pageUrl) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Заголовок
  const h1 = doc.querySelector('h1');
  const title = h1 ? h1.textContent.trim() : '';

  // Основной текст (ищем самый большой текстовый блок)
  const candidates = ['#content', '.content', '.article', 'article', '.text', 'main', '.main'];
  let mainEl = null;
  for (const sel of candidates) {
    const el = doc.querySelector(sel);
    if (el && el.textContent.length > 200) { mainEl = el; break; }
  }

  if (!mainEl) {
    // Fallback: ищем div с наибольшим количеством текста
    const divs = [...doc.querySelectorAll('div')];
    mainEl = divs.sort((a, b) => b.textContent.length - a.textContent.length)[0];
  }

  // Извлекаем параграфы
  const paragraphs = mainEl
    ? [...mainEl.querySelectorAll('p, li')].map(el => el.textContent.trim()).filter(t => t.length > 40)
    : [];

  // Очищаем навигационный мусор
  const description = paragraphs
    .filter(p => !p.includes('Перейти') && !p.includes('Главная') && !p.includes('©'))
    .slice(0, 8)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, description, sourceUrl: pageUrl };
}

// Родовые географические слова — не используем для матчинга
const GEO_STOPWORDS = new Set([
  'озеро', 'река', 'гора', 'сопка', 'вулкан', 'остров', 'бухта',
  'залив', 'пролив', 'мыс', 'долина', 'перевал', 'хребет', 'ключ',
]);

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[ьъ]/g, '')
    .replace(/[^а-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimilar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  // Прямое вхождение (без стоп-слов — опасно само по себе)
  if (na === nb) return true;
  // Значимые слова — только не-стоп
  const sigA = na.split(' ').filter(w => w.length > 3 && !GEO_STOPWORDS.has(w));
  const sigB = nb.split(' ').filter(w => w.length > 3 && !GEO_STOPWORDS.has(w));
  if (sigA.length === 0 || sigB.length === 0) return false;
  // Хотя бы одно значимое слово должно совпадать в обеих строках
  return sigA.some(w => sigB.includes(w));
}

function makeDedupeKey(sourceUrl, title) {
  try {
    const hostname = new URL(sourceUrl).hostname;
    const slug = title.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80);
    return `${hostname}:${slug}`;
  } catch {
    return `topkam.ru:${title.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80)}`;
  }
}

// ── Основная логика ───────────────────────────────────────────
async function main() {
  console.log(`\n=== enrich-from-topkam.js ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  const pool = KB_ONLY ? null : new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const kbDir = path.join(__dirname, 'kb-docs');
  const kbUpdates = {}; // slug → [{title, description, url}]
  let dbUpdated = 0;

  for (const cat of ATTRACTION_CATEGORIES) {
    console.log(`\n── ${cat.label} (${cat.url}) ──`);

    const listHtml = await fetchPage(BASE_URL + cat.url);
    if (!listHtml) { console.log('  Пропуск — нет ответа'); continue; }

    const links = extractLinks(listHtml, BASE_URL, cat.url);
    console.log(`  Найдено страниц: ${links.length}`);

    if (!kbUpdates[cat.slug]) kbUpdates[cat.slug] = [];

    for (const link of links) {
      await sleep(DELAY_MS);

      const html = await fetchPage(link);
      if (!html) continue;

      const { title, description, sourceUrl } = extractAttractionContent(html, link);
      if (!title || description.length < 80) {
        console.log(`  Пропуск (мало текста): ${link.split('/').pop()}`);
        continue;
      }

      console.log(`  + ${title.slice(0, 50)} (${description.length} симв.)`);
      kbUpdates[cat.slug].push({ title, description, sourceUrl });

      // Обновляем БД
      if (!KB_ONLY && pool) {
        try {
          const dedupeKey = makeDedupeKey(sourceUrl, title);

          // Сначала проверяем: есть ли уже такой dedupe key
          const existRes = await pool.query(
            'SELECT id, title FROM agent_route_knowledge WHERE route_dedupe_key = $1',
            [dedupeKey]
          );
          if (existRes.rows[0]) {
            // Уже есть — обновляем только если description короткое
            if (DRY_RUN) {
              console.log(`    [DRY] UPDATE (существует): "${existRes.rows[0].title}"`);
            } else {
              await pool.query(
                `UPDATE agent_route_knowledge SET description = $1
                 WHERE route_dedupe_key = $2 AND (description IS NULL OR length(description) < 100)`,
                [description, dedupeKey]
              );
              dbUpdated++;
            }
          } else {
            // Ищем приблизительный матч в существующих записях
            const res = await pool.query(
              `SELECT id, title FROM agent_route_knowledge
               WHERE category = $1
                 AND (description IS NULL OR length(description) < 100)
               LIMIT 100`,
              [cat.slug]
            );
            const match = res.rows.find(r => isSimilar(r.title, title));

            if (match) {
              if (DRY_RUN) {
                console.log(`    [DRY] UPDATE "${match.title}" ← "${title}"`);
              } else {
                await pool.query(
                  `UPDATE agent_route_knowledge
                   SET description = $1, source_url = COALESCE(source_url, $2)
                   WHERE id = $3`,
                  [description, sourceUrl, match.id]
                );
                dbUpdated++;
                console.log(`    Обновлён: "${match.title}"`);
              }
            } else {
              // Нет матча — добавляем как новую запись знаний (is_visible=false)
              const searchText = `${title} ${description.slice(0, 200)}`;
              if (DRY_RUN) {
                console.log(`    [DRY] INSERT новая запись: "${title}"`);
              } else {
                await pool.query(
                  `INSERT INTO agent_route_knowledge
                     (route_dedupe_key, category, title, description, lat, lng,
                      source_url, source_name, search_text, payload, is_visible)
                   VALUES ($1,$2,$3,$4,NULL,NULL,$5,'topkam.ru',
                           to_tsvector('russian',$6),'{}',FALSE)
                   ON CONFLICT (route_dedupe_key) DO NOTHING`,
                  [dedupeKey, cat.slug, title, description, sourceUrl, searchText]
                );
                dbUpdated++;
                console.log(`    Добавлена новая локация: "${title}"`);
              }
            }
          }
        } catch (e) {
          console.warn(`    Ошибка БД: ${e.message}`);
        }
      }
    }
  }

  // Обновляем kb-docs
  console.log('\n── Обновление kb-docs ──');
  for (const [slug, items] of Object.entries(kbUpdates)) {
    if (items.length === 0) continue;

    const catInfo = ATTRACTION_CATEGORIES.find(c => c.slug === slug);
    const label = catInfo?.label ?? slug;
    const mdPath = path.join(kbDir, `${slug}.md`);

    // Читаем существующий файл (если есть)
    let existing = '';
    try { existing = fs.readFileSync(mdPath, 'utf8'); } catch { /* нет файла */ }

    // Добавляем новые записи с богатым описанием
    const newSections = items.map(({ title, description, sourceUrl }) => {
      // Не дублируем уже существующие
      if (existing.includes(title)) return '';
      return `\n## ${title}\n\n${description}\n\nИсточник: ${sourceUrl}\n`;
    }).filter(Boolean).join('');

    if (!newSections) {
      console.log(`  ${slug}.md — нет новых записей`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${slug}.md +${items.length} записей`);
    } else {
      // Вставляем новый контент после заголовка
      const header = existing.split('\n').slice(0, 3).join('\n');
      const rest = existing.split('\n').slice(3).join('\n');
      const updated = `${header}\n${newSections}${rest}`;
      fs.writeFileSync(mdPath, updated, 'utf8');
      console.log(`  ${slug}.md +${items.length} записей`);
    }
  }

  if (pool) await pool.end();

  console.log(`\n=== Готово. БД обновлено: ${dbUpdated} маршрутов ===`);
  if (!DRY_RUN && !KB_ONLY) {
    console.log('Следующий шаг: node scripts/update-knowledge-base.js');
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
