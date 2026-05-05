/**
 * lib/agents/kamchatkaland-importer.ts
 *
 * Импортирует тематические статьи о природных местах Камчатки
 * с kamchatkaland.ru/note/
 *
 * 27 статей по 1200-4500 слов: вулканы, источники, гейзеры, озёра,
 * реки, водопады, бухты, животные, растения, парки...
 *
 * Каждая статья → запись в agent_route_knowledge (kind='article').
 * Kuzmich использует как RAG-контекст при вопросах о природе Камчатки.
 */

import { createHash } from 'crypto';
import { pool } from '@/lib/db-pool';

const JSDOM = (require('jsdom') as any).JSDOM as new (html: string) => { window: { document: Document } };

const BASE = 'https://kamchatkaland.ru';
const SOURCE_NAME = 'kamchatkaland.ru';

export interface KamchatkalandResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

// Все известные статьи + их категории
const ARTICLES: Array<{ slug: string; category: string; activity_type: string; location_type: string }> = [
  { slug: 'vulkany-kamchatki',              category: 'vulkani',              activity_type: 'volcano',    location_type: 'volcano'    },
  { slug: 'dolina-gejzerov',                category: 'geyzery',              activity_type: 'helicopter', location_type: 'geyser'     },
  { slug: 'goryachie-istochniki',           category: 'termalnye_istochniki', activity_type: 'thermal',    location_type: 'hot_spring' },
  { slug: 'ozera',                          category: 'lakes',                activity_type: 'eco',        location_type: 'lake'       },
  { slug: 'reki',                           category: 'rivers',               activity_type: 'fishing',    location_type: 'river'      },
  { slug: 'reka-kamchatka',                 category: 'rivers',               activity_type: 'fishing',    location_type: 'river'      },
  { slug: 'vodopady',                       category: 'trekking',             activity_type: 'trekking',   location_type: 'waterfall'  },
  { slug: 'buhty',                          category: 'morskie_progulki',     activity_type: 'boat_trip',  location_type: 'bay'        },
  { slug: 'parki',                          category: 'eco',                  activity_type: 'eco',        location_type: 'other'      },
  { slug: 'zhivotnye',                      category: 'medvedi',              activity_type: 'bears',      location_type: 'other'      },
  { slug: 'morskoj-mir-kamchatki',          category: 'morskie_progulki',     activity_type: 'boat_trip',  location_type: 'bay'        },
  { slug: 'rasteniya',                      category: 'eco',                  activity_type: 'eco',        location_type: 'forest'     },
  { slug: 'flora',                          category: 'eco',                  activity_type: 'eco',        location_type: 'forest'     },
  { slug: 'derevya-kamchatki',              category: 'eco',                  activity_type: 'eco',        location_type: 'forest'     },
  { slug: 'relef-kamchatki',                category: 'trekking',             activity_type: 'trekking',   location_type: 'mountain'   },
  { slug: 'territoriya-kamchatki',          category: 'ekskursii',            activity_type: 'eco',        location_type: 'other'      },
  { slug: 'goroda-poselenija',              category: 'ekskursii',            activity_type: 'eco',        location_type: 'other'      },
  { slug: 'esso',                           category: 'ekskursii',            activity_type: 'eco',        location_type: 'other'      },
  { slug: 'poselok-klyuchi',                category: 'ekskursii',            activity_type: 'eco',        location_type: 'other'      },
  { slug: 'nizhnekamchatsk',                category: 'ekskursii',            activity_type: 'eco',        location_type: 'other'      },
  { slug: 'ozero-azhabachje',               category: 'lakes',                activity_type: 'eco',        location_type: 'lake'       },
  { slug: 'zima',                           category: 'trekking',             activity_type: 'winter_hiking', location_type: 'other'  },
  { slug: 'kogda-luchshe-ehat-na-kamchatku', category: 'ekskursii',           activity_type: 'eco',        location_type: 'other'     },
  { slug: 'istoriya',                       category: 'ekskursii',            activity_type: 'eco',        location_type: 'other'      },
  { slug: 'ekologicheskie-problemyi-kamchatki', category: 'eco',              activity_type: 'eco',        location_type: 'other'     },
  { slug: 'raznoe',                         category: 'ekskursii',            activity_type: 'eco',        location_type: 'other'      },
  { slug: 'ug',                             category: 'trekking',             activity_type: 'trekking',   location_type: 'other'      },
];

// ── Заголовки статей для читаемых title ────────────────────────────

const ARTICLE_TITLES: Record<string, string> = {
  'vulkany-kamchatki':                'Вулканы Камчатки',
  'dolina-gejzerov':                  'Долина Гейзеров',
  'goryachie-istochniki':             'Горячие источники Камчатки',
  'ozera':                            'Озёра Камчатки',
  'reki':                             'Реки Камчатки',
  'reka-kamchatka':                   'Река Камчатка',
  'vodopady':                         'Водопады Камчатки',
  'buhty':                            'Бухты Камчатки',
  'parki':                            'Природные парки Камчатки',
  'zhivotnye':                        'Животные Камчатки',
  'morskoj-mir-kamchatki':            'Морской мир Камчатки',
  'rasteniya':                        'Растения Камчатки',
  'flora':                            'Флора Камчатки',
  'derevya-kamchatki':                'Деревья Камчатки',
  'relef-kamchatki':                  'Рельеф Камчатки',
  'territoriya-kamchatki':            'Территория Камчатки',
  'goroda-poselenija':                'Города и посёлки Камчатки',
  'esso':                             'Поселок Эссо',
  'poselok-klyuchi':                  'Поселок Ключи',
  'nizhnekamchatsk':                  'Нижнекамчатск',
  'ozero-azhabachje':                 'Озеро Азабачье',
  'zima':                             'Зима на Камчатке',
  'kogda-luchshe-ehat-na-kamchatku':  'Когда лучше ехать на Камчатку',
  'istoriya':                         'История Камчатки',
  'ekologicheskie-problemyi-kamchatki': 'Экологические проблемы Камчатки',
  'raznoe':                           'Разное о Камчатке',
  'ug':                               'Юг Камчатки',
};

// ── Скачать и распарсить статью ────────────────────────────────────

async function fetchArticle(slug: string): Promise<string | null> {
  const url = `${BASE}/note/${slug}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TourHabBot/1.0 (tourhab.ru; knowledge enrichment)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Убрать навигацию, скрипты, футер
    ['nav', 'header', 'footer', 'script', 'style', 'noscript', '.menu', '.footer', '.header'].forEach(sel => {
      doc.querySelectorAll(sel).forEach((el: Element) => el.remove());
    });

    // Собрать текст из параграфов
    const paragraphs: string[] = [];
    doc.querySelectorAll('p, h2, h3, li').forEach((el: Element) => {
      const text = el.textContent?.trim() ?? '';
      if (text.length > 30) paragraphs.push(text);
    });

    const text = paragraphs.join('\n\n').replace(/\s{3,}/g, '\n\n').trim();
    return text.length > 200 ? text : null;
  } catch {
    return null;
  }
}

// ── Upsert статьи в БД ─────────────────────────────────────────────

async function upsertArticle(
  slug: string,
  description: string,
  meta: typeof ARTICLES[number],
): Promise<'inserted' | 'updated' | 'skipped'> {
  const dedupeKey = `kl_${slug}`;
  const title = ARTICLE_TITLES[slug] ?? slug.replace(/-/g, ' ');
  const url = `${BASE}/note/${slug}`;
  const searchText = `${title} ${description}`.slice(0, 3000);
  const sourceHash = createHash('md5').update(description).digest('hex');

  const { rowCount } = await pool.query(
    `INSERT INTO agent_route_knowledge
       (id, route_dedupe_key, title, description, category, activity_type, location_type,
        source_url, source_name, search_text, source_hash, kind,
        is_visible, source_updated_at, last_synced_at, created_at, updated_at)
     VALUES (
       gen_random_uuid(), $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, 'place',
       true, NOW(), NOW(), NOW(), NOW()
     )
     ON CONFLICT (route_dedupe_key) DO UPDATE SET
       description    = EXCLUDED.description,
       search_text    = EXCLUDED.search_text,
       source_hash    = EXCLUDED.source_hash,
       last_synced_at = NOW(),
       updated_at     = NOW()`,
    [dedupeKey, title, description, meta.category, meta.activity_type, meta.location_type,
     url, SOURCE_NAME, searchText, sourceHash],
  );

  return (rowCount ?? 0) > 0 ? 'inserted' : 'skipped';
}

// ── Главная функция ────────────────────────────────────────────────

export async function runKamchatkalandImporter(batchSize = 10): Promise<KamchatkalandResult> {
  const start = Date.now();
  let inserted = 0, updated = 0, skipped = 0, errors = 0;

  // Найти статьи, которых нет или которые устарели
  const existingKeys = await pool.query<{ k: string }>(
    `SELECT route_dedupe_key AS k FROM agent_route_knowledge WHERE source_name = $1`,
    [SOURCE_NAME],
  );
  const existing = new Set(existingKeys.rows.map(r => r.k));

  const toProcess = ARTICLES.filter(a => !existing.has(`kl_${a.slug}`))
    .slice(0, batchSize);

  for (const article of toProcess) {
    const description = await fetchArticle(article.slug);
    if (!description) {
      console.error(`  fetch returned null for ${article.slug}`);
      errors++;
      continue;
    }
    try {
      const result = await upsertArticle(article.slug, description, article);
      if (result === 'inserted') inserted++;
      else if (result === 'updated') updated++;
      else skipped++;
    } catch (e) {
      console.error(`  upsert error for ${article.slug}:`, e instanceof Error ? e.message : e);
      errors++;
    }
    await new Promise(r => setTimeout(r, 400));
  }

  return { inserted, updated, skipped, errors, duration_ms: Date.now() - start };
}
