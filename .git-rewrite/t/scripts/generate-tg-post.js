/**
 * Генератор постов Кузьмича для Telegram-канала
 *
 * Что делает:
 *   1. Берёт случайный маршрут из БД (с описанием, если есть)
 *   2. Генерирует пост в голосе Кузьмича через AI
 *   3. Публикует в TG-канал (или выводит в консоль --dry-run)
 *
 * Использование:
 *   node scripts/generate-tg-post.js                     — пост и публикации
 *   node scripts/generate-tg-post.js --dry-run           — только вывод в консоль
 *   node scripts/generate-tg-post.js --topic vulkani      — конкретная категория
 *   node scripts/generate-tg-post.js --topic seasonal     — сезонный совет
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN         — токен @KuzmichKam_bot
 *   TELEGRAM_CHANNEL_ID        — ID канала (напр. @kamchatour или -1001234567)
 *   TIMEWEB_TOKEN + TIMEWEB_AI_AGENT_ID  — AI (первичный)
 *   OPENROUTER_API_KEY         — fallback
 */

const { Pool } = require('pg');
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

const DRY_RUN  = process.argv.includes('--dry-run');
const TOPIC_IDX = process.argv.indexOf('--topic');
const TOPIC = TOPIC_IDX !== -1 ? process.argv[TOPIC_IDX + 1] : null;

// ── Промпт Кузьмича ──────────────────────────────────────────
// (дублируем здесь — скрипт standalone, не импортирует TS)
const KUZMICH_SYSTEM = `Ты — Кузьмич, виртуальный гид Камчатки в Telegram-канале TourHab.

КТО ТЫ: Камчадал в третьем поколении. Живёшь в Петропавловске. Прошёл 300+ маршрутов лично. Не реклама — живой голос с мнением и характером.

КАК ПИШЕШЬ:
- Разговорно: "Сходи — не пожалеешь", не "рекомендуем рассмотреть"
- Местные названия: П-К, Авача, Долина, Мутный
- Короткая личная деталь (1 предложение) — делает текст живым
- Прямой: если маршрут не для новичков — скажи сразу
- Тепло, без сюсюканья

ФОРМАТ ПОСТА (строго):
- Первая строка: эмодзи + жирный заголовок (HTML: <b>Заголовок</b>)
- 3-4 абзаца: место → что увидишь → реальный совет от Кузьмича
- Ссылка на платформу: https://tourhab.ru/routes
- 2-3 хэштега в конце: #Камчатка + тематические

ОГРАНИЧЕНИЯ:
- Без выдуманных цен и дат — пишешь про место, не про конкретный тур
- Без галлюцинаций — только реальные факты о Камчатке
- Длина: 150-250 слов. Не длиннее.
- HTML-разметка для Telegram: <b>жирный</b>, <i>курсив</i>`;

// ── Примеры тем для разнообразия ─────────────────────────────
const POST_THEMES = [
  { type: 'location',  hint: 'пост про конкретный маршрут или локацию' },
  { type: 'seasonal',  hint: 'сезонный совет: что делать в этот период года' },
  { type: 'safety',    hint: 'совет по безопасности от бывалого — медведи, погода, снаряжение' },
  { type: 'fishing',   hint: 'рыбалка на Камчатке — виды, места, сезон' },
  { type: 'insider',   hint: 'секретное место или совет, куда не водят массовые туры' },
];

// ── Контекст платформы ────────────────────────────────────────
const PLATFORM_CONTEXT = `ПЛАТФОРМА: TourHab (tourhab.ru) — агрегатор туров и маршрутов Камчатки.
Операторы в каталоге:
• Камчатская Рыбалка (kamchatskaya-rybalka) — рыбалка на нерку, чавычу, горбушу; база на реке Большой
• Камчатинтур (kamchatintour) — пакетные туры с 1991 года, РТО 006765, официальный оператор
• TopKam (topkam) — однодневные и многодневные активные туры, вулканы, треккинг
• Вулкан Гид (vulkan-gid) — специализация: восхождения и треккинг на вулканы Камчатки
• Камчатка Дикая (kamchatka-wild) — наблюдение за медведями, вертолётные туры, дикая природа
Маршрутов в каталоге: 1158+. Каталог: https://tourhab.ru/routes
Категории: вулканы, рыбалка, треккинг, термальные источники, медведи, вертолётные туры, сплавы, фотосафари и другие.`;

// ── Маппинг категория → оператор ─────────────────────────────
const CATEGORY_OPERATOR = {
  rybalka:    'Камчатская Рыбалка (tourhab.ru/operators/kamchatskaya-rybalka) — специалисты по рыбалке на Камчатке.',
  vulkani:    'Вулкан Гид (tourhab.ru/operators/vulkan-gid) — восхождения и треккинг на вулканы.',
  medvedi:    'Камчатка Дикая (tourhab.ru/operators/kamchatka-wild) — наблюдение за медведями вплотную.',
  vertolyoty: 'Камчатка Дикая (tourhab.ru/operators/kamchatka-wild) — вертолётные туры на вулканы и природные объекты.',
  treking:    'TopKam (tourhab.ru/operators/topkam) и Вулкан Гид — пешие маршруты и восхождения.',
  termalnye:  'Камчатинтур (tourhab.ru/operators/kamchatintour) — туры к термальным источникам с 1991 года.',
  splav:      'TopKam (tourhab.ru/operators/topkam) — сплавы и активные туры по рекам Камчатки.',
};

// ── AI вызов (waterfall) ─────────────────────────────────────
async function callAI(systemPrompt, userPrompt) {
  // 1. Timeweb Claude 4.6 (primary — system prompt работает)
  const twToken = process.env.TIMEWEB_TOKEN;
  const twAgent = process.env.TIMEWEB_AI_AGENT_ID;
  if (twToken && twAgent) {
    try {
      const res = await fetch(
        `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/${twAgent}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${twToken}` },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            temperature: 0.7,
            max_tokens: 600,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
          signal: AbortSignal.timeout(30_000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) { console.log('  AI: Timeweb Claude'); return text.trim(); }
      }
    } catch (e) { console.warn(`  Timeweb err: ${e.message}`); }
  }

  // 2. OpenRouter fallback
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orKey}` },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-6',
          temperature: 0.7,
          max_tokens: 600,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) { console.log('  AI: OpenRouter'); return text.trim(); }
      }
    } catch (e) { console.warn(`  OpenRouter err: ${e.message}`); }
  }

  return null;
}

// ── Публикация в TG-канал ────────────────────────────────────
async function postToTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn('  Нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHANNEL_ID — только вывод');
    return false;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: channelId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });

  const data = await res.json();
  if (data.ok) {
    console.log(`  Опубликовано! message_id=${data.result.message_id}`);
    return true;
  } else {
    console.error('  TG ошибка:', data.description);
    return false;
  }
}

// ── Основная логика ──────────────────────────────────────────
async function main() {
  console.log(`\n=== generate-tg-post.js ${DRY_RUN ? '[DRY RUN]' : ''} ===`);
  if (TOPIC) console.log(`Тема: ${TOPIC}`);

  // Выбираем тему
  const theme = TOPIC
    ? (POST_THEMES.find(t => t.type === TOPIC) ?? POST_THEMES[0])
    : POST_THEMES[Math.floor(Math.random() * POST_THEMES.length)];

  let routeContext = '';

  // Берём случайный маршрут из БД для контекста
  if (theme.type === 'location' || theme.type === 'fishing' || theme.type === 'insider') {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      const categoryFilter = theme.type === 'fishing'
        ? `AND category = 'rybalka'`
        : theme.type === 'insider'
          ? `AND category NOT IN ('vulkani', 'rybalka')` // менее очевидные категории
          : '';

      const res = await pool.query(
        `SELECT id, title, category, description, source_url,
                payload->>'best_months' AS best_months,
                payload->>'difficulty' AS difficulty
         FROM agent_route_knowledge
         WHERE is_visible = TRUE
            OR (description IS NOT NULL AND length(description) > 100)
         ${categoryFilter}
         ORDER BY RANDOM()
         LIMIT 1`
      );

      if (res.rows[0]) {
        const r = res.rows[0];
        const routeUrl = `https://tourhab.ru/routes/${r.id}`;
        routeContext = `Маршрут для поста: "${r.title}" (категория: ${r.category})`;
        routeContext += `\nСсылка на маршрут: ${routeUrl}`;
        if (r.description) routeContext += `\nОписание: ${r.description.slice(0, 400)}`;
        if (r.difficulty) routeContext += `\nСложность: ${r.difficulty}`;
        if (r.best_months) routeContext += `\nЛучшие месяцы: ${r.best_months}`;
        if (r.source_url)  routeContext += `\nИсточник: ${r.source_url}`;
        const opHint = CATEGORY_OPERATOR[r.category];
        if (opHint) routeContext += `\nОператор по теме: ${opHint}`;
      }
    } catch (e) {
      console.warn(`  БД недоступна: ${e.message}. Работаем без контекста маршрута.`);
    } finally {
      await pool.end();
    }
  }

  // Формируем user prompt
  const currentMonth = new Date().toLocaleString('ru-RU', { month: 'long' });
  let userPrompt = `${PLATFORM_CONTEXT}\n\n`;
  if (routeContext) {
    userPrompt += `Напиши пост для Telegram-канала о Камчатке.\n\n${routeContext}\n\nСтиль: ${theme.hint}\nТекущий месяц на дворе: ${currentMonth}.`;
    userPrompt += `\n\nВАЖНО: В посте используй прямую ссылку на маршрут (не tourhab.ru/routes). Если упоминаешь оператора — дай ссылку на его профиль.`;
  } else {
    userPrompt += `Напиши пост для Telegram-канала о Камчатке.\nТема: ${theme.hint}\nТекущий месяц: ${currentMonth}.`;
    userPrompt += `\n\nВ конце поста дай ссылку на каталог: https://tourhab.ru/routes`;
  }

  console.log('\nГенерирую пост...');
  const post = await callAI(KUZMICH_SYSTEM, userPrompt);

  if (!post) {
    console.error('AI не вернул ответ. Проверь TIMEWEB_TOKEN / OPENROUTER_API_KEY.');
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(50));
  console.log(post);
  console.log('─'.repeat(50));
  console.log(`\nДлина: ${post.split(' ').length} слов`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] В канал не отправляем.');
    return;
  }

  await postToTelegram(post);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
