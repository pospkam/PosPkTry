/**
 * Парсер туров "Камчатская Рыбалка" из Tilda API
 * 
 * Использует единую схему из types/tours.ts
 * API docs: https://help-ru.tilda.cc/api
 * 
 * @author KamchatourHub
 * @date 2026-03-07
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

const TILDA_CONFIG = {
  publicKey: 'zrefrc2397r0vqpzjpex',
  secretKey: '16b2c5b78a22f194e1b5',
  baseUrl: 'https://api.tildacdn.info/v1',
};

const OUTPUT_FILE = path.join(__dirname, '..', 'fishingkam-tours.json');

// Маппинг из types/tours.ts (дублируем для Node.js без TS)
const DIFFICULTY_MAP = {
  'Лёгкий': 'easy',
  'Легкий': 'easy',
  'Средний': 'medium',
  'Сложный': 'hard',
  'Очень сложный': 'hard',
  'Экстремальный': 'hard',
  'Very Easy': 'easy',
  'Easy': 'easy',
  'Medium': 'medium',
  'Moderate': 'medium',
  'Hard': 'hard',
  'Very Hard': 'hard',
  'Extreme': 'hard',
};

const CATEGORY_MAP = {
  'Вулканы': 'volcanoes',
  'Рыбалка': 'fishing',
  'Термы': 'thermal',
  'Горячие источники': 'thermal',
  'Горы': 'mountains',
  'Гейзеры': 'geysers',
  'Реки': 'rivers',
  'Озёра': 'lakes',
  'Эко': 'eco',
  'Приключения': 'adventure',
  'Комбо': 'combo',
  'Снегоход': 'snowmobile',
  'Джип': 'jeep',
  'Животные': 'wildlife',
  'Fishing': 'fishing',
  'Hot Springs': 'thermal',
  'Combo': 'combo',
};

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * HTTP запрос к Tilda API
 */
function tildaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${TILDA_CONFIG.baseUrl}/${endpoint}`;
    const urlWithAuth = `${url}${url.includes('?') ? '&' : '?'}publickey=${TILDA_CONFIG.publicKey}&secretkey=${TILDA_CONFIG.secretKey}`;

    console.log(`[TILDA] GET ${endpoint}`);

    https.get(urlWithAuth, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'FOUND') {
            resolve(parsed.result);
          } else {
            reject(new Error(`Tilda API error: ${parsed.message || 'Unknown error'}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Нормализует difficulty по правилам
 */
function normalizeDifficulty(value) {
  if (!value) return 'medium';
  const normalized = DIFFICULTY_MAP[value.trim()];
  if (normalized) return normalized;
  console.warn(`[WARN] Unknown difficulty: "${value}", using medium`);
  return 'medium';
}

/**
 * Нормализует category по правилам
 */
function normalizeCategory(value) {
  if (!value) return 'fishing'; // Партнер - рыболовный
  const normalized = CATEGORY_MAP[value.trim()];
  if (normalized) return normalized;
  console.warn(`[WARN] Unknown category: "${value}", using fishing`);
  return 'fishing';
}

/**
 * Извлекает цену из текста Tilda
 */
function extractPrice(html) {
  // Поиск паттернов: "15000 руб", "15 000 ₽", "от 10000"
  const patterns = [
    /(\d+[\s\u00A0]?\d*)\s*(?:руб|₽|rub)/i,
    /(?:от|цена)[\s:]+(\d+[\s\u00A0]?\d*)/i,
    /(\d{4,})/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseInt(match[1].replace(/[\s\u00A0]/g, ''));
      if (price > 0) return price;
    }
  }

  return 0; // Не нашли цену
}

/**
 * Извлекает длительность из текста
 */
function extractDuration(html) {
  // Паттерны: "3 дня", "5 часов", "2-3 дня"
  const patterns = [
    /(\d+)[\s-]*(?:дн|day)/i,
    /(\d+)[\s-]*(?:час|hour)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      // Если дни - переводим в часы (*24), если часы - оставляем
      if (pattern.source.includes('дн') || pattern.source.includes('day')) {
        return value * 24;
      }
      return value;
    }
  }

  return 24; // По умолчанию 1 день
}

/**
 * Извлекает сложность из текста
 */
function extractDifficulty(html, title) {
  const text = (html + ' ' + title).toLowerCase();
  
  if (text.includes('экстрем') || text.includes('extreme')) return 'hard';
  if (text.includes('сложн') || text.includes('hard')) return 'hard';
  if (text.includes('средн') || text.includes('medium')) return 'medium';
  if (text.includes('лёгк') || text.includes('легк') || text.includes('easy')) return 'easy';
  
  return 'medium'; // По умолчанию
}

/**
 * Извлекает координаты из Tilda блоков
 */
function extractCoordinates(page) {
  const coords = [];
  
  // Tilda хранит координаты в блоках типа "map"
  if (page.html && page.html.includes('data-map-lat')) {
    const latMatch = page.html.match(/data-map-lat="([\d.]+)"/);
    const lngMatch = page.html.match(/data-map-lng="([\d.]+)"/);
    
    if (latMatch && lngMatch) {
      coords.push({
        lat: parseFloat(latMatch[1]),
        lng: parseFloat(lngMatch[1]),
        name: page.title,
      });
    }
  }
  
  return coords.length > 0 ? coords : undefined;
}

/**
 * Очищает HTML, оставляет только текст
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// ПАРСИНГ
// ============================================================================

/**
 * Парсит страницу Tilda в тур
 */
function parseTildaPage(page) {
  const html = page.html || '';
  const description = stripHtml(page.descr || html.substring(0, 1000));

  const tour = {
    // Обязательные поля
    name: page.title || 'Без названия',
    description: description || 'Описание отсутствует',
    difficulty: normalizeDifficulty(extractDifficulty(html, page.title)),
    duration: extractDuration(html + ' ' + page.title),
    price: extractPrice(html),
    
    // Дополнительные
    category: normalizeCategory(page.category || 'Рыбалка'),
    short_description: description.substring(0, 200),
    currency: 'RUB',
    season: ['summer', 'autumn'], // Рыбалка обычно летом-осенью
    coordinates: extractCoordinates(page),
    
    // Группа (рыбалка обычно малые группы)
    max_group_size: 8,
    min_group_size: 2,
    
    // Метаданные
    is_active: page.published > 0,
    source: 'fishingkam_tilda',
    source_url: page.alias ? `https://fishingkam.ru/${page.alias}` : undefined,
    tilda_page_id: page.id,
  };

  return tour;
}

/**
 * Основная функция парсинга
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Парсер туров "Камчатская Рыбалка" (Tilda API)');
  console.log('='.repeat(80));

  try {
    // 1. Получаем список проектов
    console.log('\n[1/4] Получение списка проектов...');
    const projects = await tildaRequest('getprojectslist');
    console.log(`✓ Найдено проектов: ${projects.length}`);

    if (projects.length === 0) {
      throw new Error('Нет проектов в аккаунте');
    }

    // Берём первый проект (обычно у партнера 1 сайт)
    const projectId = projects[0].id;
    console.log(`  Проект: "${projects[0].title}" (ID: ${projectId})`);

    // 2. Получаем список страниц
    console.log('\n[2/4] Получение списка страниц...');
    const pages = await tildaRequest(`getpageslist?projectid=${projectId}`);
    console.log(`✓ Найдено страниц: ${pages.length}`);

    // Фильтруем только опубликованные страницы с релевантными названиями
    const tourPages = pages.filter(p => {
      const title = (p.title || '').toLowerCase();
      // Исключаем служебные страницы
      if (title.includes('контакт') || title.includes('contact')) return false;
      if (title.includes('главная') || title.includes('home')) return false;
      if (title.includes('о нас') || title.includes('about')) return false;
      if (title.includes('отзыв') || title.includes('review')) return false;
      
      return p.published > 0;
    });

    console.log(`  Отфильтровано туров: ${tourPages.length}`);

    // 3. Получаем полное содержимое каждой страницы
    console.log('\n[3/4] Загрузка полного содержимого страниц...');
    const tours = [];

    for (let i = 0; i < tourPages.length; i++) {
      const page = tourPages[i];
      console.log(`  [${i + 1}/${tourPages.length}] ${page.title}...`);

      try {
        // Получаем полную страницу с HTML
        const fullPage = await tildaRequest(`getpagefull?pageid=${page.id}`);
        
        // Парсим в тур
        const tour = parseTildaPage(fullPage);
        tours.push(tour);

        console.log(`    ✓ Цена: ${tour.price}₽, Длительность: ${tour.duration}ч, Сложность: ${tour.difficulty}`);

        // Задержка между запросами (rate limit)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`    ✗ Ошибка: ${err.message}`);
      }
    }

    // 4. Сохраняем результат
    console.log('\n[4/4] Сохранение результата...');
    const output = {
      source: 'Камчатская Рыбалка (fishingkam.ru)',
      parsed_at: new Date().toISOString(),
      count: tours.length,
      tours,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✓ Сохранено в: ${OUTPUT_FILE}`);

    // Статистика
    console.log('\n' + '='.repeat(80));
    console.log('СТАТИСТИКА');
    console.log('='.repeat(80));
    console.log(`Всего туров:        ${tours.length}`);
    console.log(`С ценами:           ${tours.filter(t => t.price > 0).length}`);
    console.log(`С координатами:     ${tours.filter(t => t.coordinates).length}`);
    console.log(`Активных:           ${tours.filter(t => t.is_active).length}`);
    
    const byDifficulty = tours.reduce((acc, t) => {
      acc[t.difficulty] = (acc[t.difficulty] || 0) + 1;
      return acc;
    }, {});
    console.log(`\nПо сложности:`);
    console.log(`  Easy:             ${byDifficulty.easy || 0}`);
    console.log(`  Medium:           ${byDifficulty.medium || 0}`);
    console.log(`  Hard:             ${byDifficulty.hard || 0}`);

    console.log('\n✅ Парсинг завершён успешно!');
    console.log('\nСледующий шаг: node scripts/import-fishingkam-to-db.js');

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ============================================================================
// ЗАПУСК
// ============================================================================

if (require.main === module) {
  main();
}

module.exports = { parseTildaPage, normalizeDifficulty, normalizeCategory };
