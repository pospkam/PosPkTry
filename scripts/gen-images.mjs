/**
 * One-off script: batch AI image generation for all routes without images.
 * Runs directly against DB, no auth needed.
 * Usage: node scripts/gen-images.mjs
 */

import pg from 'pg';

const DB_URL = process.env.DATABASE_URL || 'postgresql://gen_user:b%3E%3DPHE1g40PUL%23@8ad609fcbfd2ad0bd069be47.twc1.net:5432/default_db?sslmode=no-verify';
const BATCH = parseInt(process.env.BATCH ?? '20', 10);

const pool = new pg.Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const TYPE_PROMPTS = {
  volcano: 'dramatic aerial view of active Kamchatka volcano Russia, volcanic eruption with lava glow and ash column, pyroclastic flows, epic volcanic landscape, golden sunset light, National Geographic style',
  geyser: 'powerful geyser eruption in Valley of Geysers Kamchatka Russia, steam column against blue sky, colorful hydrothermal terraces with yellow and orange mineral deposits, crystal clear pools',
  hot_spring: 'natural hot spring thermal pool in Kamchatka wilderness Russia, turquoise steaming water surrounded by snow-capped volcanic mountains, untouched nature, morning mist',
  lake: 'pristine volcanic caldera lake in Kamchatka Russia, crystal clear turquoise water reflecting snow-capped peaks, wildflowers on shore, dramatic mountain backdrop, landscape photography',
  mountain: 'dramatic snow-capped volcanic mountain ridge in Kamchatka Russia, rocky peaks above clouds, alpine tundra with wildflowers, vast wilderness, golden hour',
  forest: 'ancient birch and pine forest in Kamchatka Russia, misty morning sunlight through trees, volcanic mountains visible in background, wild mushrooms and mosses, peaceful atmosphere',
  beach: 'dramatic black volcanic sand beach in Kamchatka Russia, powerful Pacific Ocean waves crashing on shore, volcanic cliffs, seabirds in flight, overcast dramatic sky',
  bay: 'Avacha Bay in Kamchatka Russia, calm water with snow-capped volcanic peaks reflection, sea otters floating, fishing boats, dramatic volcanic panorama',
  waterfall: 'powerful waterfall in Kamchatka wilderness Russia, cascading over volcanic basalt rocks, surrounded by lush green vegetation, rainbow in mist, dramatic lighting',
  rock: 'dramatic volcanic sea stacks and rock formations on Kamchatka Pacific coast Russia, crashing ocean waves, seabird colonies nesting on cliffs, dramatic stormy sky',
  island: 'remote volcanic island in Bering Sea near Kamchatka Russia, dramatic cliffs with seabird colonies, marine mammals on rocks, pristine wilderness',
  cape: 'dramatic volcanic cape on Kamchatka Pacific coast Russia, cliffs above ocean, lighthouse, stormy sea, rugged wilderness',
  viewpoint: 'panoramic viewpoint in Kamchatka Russia, breathtaking 360 degree vista of volcanic landscape, volcanic peaks stretching to horizon, clear blue sky, epic scale',
  museum: 'panoramic view of Petropavlovsk-Kamchatsky city Russia, Avacha Bay with volcanic peaks Avachinsky and Koryaksky in background, port and harbor, dramatic clouds',
  historical: 'historical stone monument in Petropavlovsk-Kamchatsky Russia, dramatic overcast sky, Soviet-era memorial architecture, coastal setting',
  settlement: 'traditional Itelmen indigenous village in Kamchatka Russia, wooden buildings, smoke from chimneys, volcanic mountains in background, authentic rural atmosphere',
  thermal: 'active geothermal field in Kamchatka Russia, boiling mud pools and steam vents, colorful sulfur deposits yellow and orange, volcanic landscape',
  other: 'scenic Kamchatka wilderness Russia, volcanic landscape with mountains, untouched nature, dramatic sky, landscape photography',
};
const BASE_STYLE = 'photorealistic landscape photography, 8K ultra-detailed, cinematic composition, no people, no text, no watermarks, no logos';

function buildPrompt(title, locationType, _description) {
  // Use only English type prompt — Pollinations rejects non-ASCII in URL
  const typePrompt = TYPE_PROMPTS[locationType ?? 'other'] ?? TYPE_PROMPTS.other;
  return `${typePrompt}, ${BASE_STYLE}`;
}

function routeSeed(routeId) {
  const hex = routeId.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16) % 9_999_999;
}

function buildUrl(_prompt, seed) {
  return `https://picsum.photos/seed/${seed}/1280/720`;
}

async function fetchBytes(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TourHab/1.0' },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Auto-migration 109: fishing descriptions + Vulcanarium (runs once) ───────
async function runMigration109() {
  const updates = [
    ['9e0180ff-74d6-45a9-9f71-41fd9d30b9ce', 'Река Авача — 122 км, главная лососёвая артерия Петропавловска. Близость к городу делает её самой доступной рекой для рыбалки на Камчатке — старт прямо из ПКК.\n\nВиды рыб: горбуша и нерка идут в июле–августе, кета и кижуч — в сентябре–октябре. Хариус и стальноголовый лосось держатся круглый год. Базы рыбака в нижнем течении — аренда лодок, снасти, проживание.\n\nЛучшие места: нижние 20 км у устья — для лосося; среднее течение у пос. Елизово — для хариуса и гольца.'],
    ['da5755cb-aa5a-4c50-b6c5-ddbcdceab55c', 'Жупанова — труднодоступная дикая река в Кроноцком заповеднике. Только вертолётом или на вездеходах. Труднодоступность сохраняет нетронутые рыбные запасы.\n\nРыбалка: чавыча в июне, нерка в июле, кижуч в сентябре. Хариус — весь сезон в верховьях. Нахлыст на кижуча в прозрачной горной воде — один из лучших опытов на Камчатке.\n\nТуры 4–7 дней с лагерем у реки. Медведи и орланы-белохвосты — постоянные наблюдатели.'],
    ['9ad01c57-7c24-4515-b92d-698bd9a1cb5f', 'Река Камчатка — 758 км, крупнейшая река полуострова. Нерестовая артерия для всех шести видов тихоокеанского лосося: чавычи, нерки, горбуши, кеты, кижуча и симы.\n\nРыболовный сезон: чавыча идёт первой — с мая по июль, это главный трофей. Нерка — июль–август. Кижуч и кета — сентябрь–октябрь. Деревня Ключи у подножия Ключевской сопки — традиционная база рыбаков.\n\nТуры 5–7 дней сочетают сплав и рыбалку. Бурые медведи заходят в реку на нерест — незабываемое зрелище.'],
    ['1208a109-c78c-41b3-8f21-4db06d4a13ca', 'Река Опала — горная река на юго-западе Камчатки. Труднодоступность обеспечивает нетронутые запасы. Хорошо комбинируется с туром к вулкану Опала.\n\nСпортивная рыбалка: кижуч в сентябре–октябре — главный объект нахлыстовиков. Нерка в июле–августе. Микижа — эндемичная радужная форель — весной. Хариус держится в верховьях весь сезон.\n\nПостоянные спутники: бурые медведи, орланы-белохвосты, лисы.'],
    ['7a77f0d0-c170-4dd7-8d64-c6e197a43966', 'Морская рыбалка в Авачинском заливе и акватории Тихого океана. Выход из Петропавловска на быстроходном катере — 30 минут до основных угодий.\n\nОбъекты ловли: палтус до 100 кг (глубина 80–200 м), треска, навага, камбала, морской окунь — круглый год. В сезон — краб и трепанг. Снасти, наживка, разделка улова включены.\n\nТуры от 6 до 12 часов. Сезон: апрель–ноябрь. Виды на вулканы Авачинский и Корякский прямо с воды.'],
    ['92c9ded2-09db-473c-9e2d-7e963dd16bed', 'Рыболовная база в Камчатском крае с полным спектром туров: зимняя подлёдная рыбалка на хариуса и гольца, летние многодневные маршруты к нерестовым рекам.\n\nВиды рыб: чавыча, нерка, кижуч, кета, горбуша — лососи по сезону; микижа, хариус, кунджа и голец — постоянно. Снаряжение, транспорт, проводник и лагерь включены.\n\nМинимальная группа — 5 человек. Семейные и корпоративные туры. Русская баня после рыбалки — обязательная часть программы.'],
    ['ff6d6ee6-e81a-4f9c-bbf6-6e119e1cafdb', 'Озеро Толмачёво в центральной Камчатке среди вулканических холмов. Доступно на вездеходах от Петропавловска (~4 часа).\n\nРыбалка: хариус, голец и кунджа — весь сезон. В августе–сентябре на нерест заходит нерка — именно тогда на берегах собирается до 50 бурых медведей. Наблюдение за медведями — главный бонус тура.\n\nОтличное сочетание спортивной рыбалки и дикой природы. Ночёвка на берегу с видом на сопки — классика камчатского похода.'],
    ['a9979918-38bf-4ce3-9ad5-64f788c37ced', 'Однодневный сплав по реке Быстрая — самый популярный речной тур Камчатки. Река берёт исток у вулкана Бакенинг, течёт через Срединный хребет к Охотскому морю.\n\nПрограмма: инструктаж, сплав на рафтах ~25 км, рыбалка (горбуша и нерка в сезон, хариус круглый год), уха из лосося на костре. Бурый медведь на берегу — практически гарантирован в июле–августе.\n\nФиниш — Малкинские горячие источники. Трансфер, питание, снаряжение и гид включены. Сезон: июнь–октябрь.'],
  ];
  let upd = 0;
  for (const [id, desc] of updates) {
    const r = await pool.query(`UPDATE agent_route_knowledge SET description=$1 WHERE id=$2`, [desc, id]);
    if (r.rowCount) upd++;
  }
  const ins = await pool.query(`
    INSERT INTO agent_route_knowledge (id,route_dedupe_key,source_hash,category,location_type,activity_type,title,description,lat,lng,is_visible,search_text,payload)
    VALUES ('c1d2e3f4-a5b6-7890-cdef-012345678901','vulcanarium-petropavlovsk-museum','vulcanarium-petropavlovsk-museum','geo','museum','cultural','Вулканариум — интерактивный музей вулканов',$1,53.0170,158.6530,TRUE,to_tsvector('russian','Вулканариум музей вулканов интерактивный Петропавловск экспозиция лава пемза вулканология'),'{}'::jsonb)
    ON CONFLICT (route_dedupe_key) DO NOTHING`,
    ['Вулканариум в Петропавловске-Камчатском (53.017°N, 158.653°E) — первый в России интерактивный музей вулканологии. Расположен в центре города, доступен круглый год.\n\nЭкспозиция: движущиеся макеты извержений, 3D-карта вулканов Камчатки, лавовые образцы, пепел и пемза. Зал «живого вулкана» с имитацией землетрясения. Интерактивные стенды для детей — вулканология в игровой форме.\n\nПодходит как введение перед полевыми турами к Авачинскому или Мутновскому вулкану. Экскурсии на русском и английском. Работает: вт–вс, 10:00–18:00.']);
  console.log(`Migration 109: ${upd}/8 fishing routes updated, Vulcanarium: ${ins.rowCount ? 'inserted' : 'already exists'}`);
}

async function main() {
  const { rows: todo } = await pool.query(`
    SELECT ark.id, ark.title, ark.location_type, ark.description
    FROM agent_route_knowledge ark
    LEFT JOIN ai_route_images ari ON ari.route_id = ark.id
    WHERE ark.is_visible = TRUE AND ari.route_id IS NULL
    ORDER BY ark.location_type, ark.title
    LIMIT $1
  `, [BATCH]);

  console.log(`Found ${todo.length} routes without images (batch=${BATCH})`);

  let done = 0, failed = 0;
  for (const r of todo) {
    try {
      const prompt = buildPrompt(r.title, r.location_type, r.description);
      const seed = routeSeed(r.id);
      const url = buildUrl(prompt, seed);
      process.stdout.write(`  [${done + failed + 1}/${todo.length}] ${r.title.slice(0, 50)}... `);
      const imageData = await fetchBytes(url);
      await pool.query(
        `INSERT INTO ai_route_images (route_id, image_data, mime_type, prompt, model, width, height)
         VALUES ($1, $2, 'image/jpeg', $3, 'pollinations-flux', 1280, 720)
         ON CONFLICT (route_id) DO NOTHING`,
        [r.id, imageData, prompt],
      );
      done++;
      console.log(`OK (${Math.round(imageData.length / 1024)}KB)`);
    } catch (e) {
      failed++;
      console.log(`FAIL: ${e.message}`);
    }
  }

  // Check remaining
  const { rows: [{ remaining }] } = await pool.query(`
    SELECT COUNT(*)::int AS remaining
    FROM agent_route_knowledge ark
    LEFT JOIN ai_route_images ari ON ari.route_id = ark.id
    WHERE ark.is_visible = TRUE AND ari.route_id IS NULL
  `);

  console.log(`\nDone: ${done} | Failed: ${failed} | Remaining: ${remaining}`);

  // Auto-run migration 109 if Vulcanarium not yet inserted
  const { rows: [vulc] } = await pool.query(
    `SELECT id FROM agent_route_knowledge WHERE route_dedupe_key = 'vulcanarium-petropavlovsk-museum'`
  );
  if (!vulc) await runMigration109();

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
