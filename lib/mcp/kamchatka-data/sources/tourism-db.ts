import axios from 'axios';
import { load } from 'cheerio';

export async function parseTourismObjects(searchQuery: string): Promise<unknown[]> {
  // Парсим туристические БД: Wikivoyage, Wikipedia, туристические сайты

  const urls = [
    `https://en.wikivoyage.org/wiki/Kamchatka`,
    `https://en.wikipedia.org/wiki/Kamchatka`,
    `https://en.wikivoyage.org/wiki/Petropavlovsk-Kamchatsky`,
    `https://en.wikipedia.org/wiki/Petropavlovsk-Kamchatsky`,
  ];

  const objects: unknown[] = [];

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const parsed = parseWikipediaPage(response.data, url);
      objects.push(...parsed);
    } catch (error) {
    }
  }

  return objects;
}

interface LocationObject {
  name?: string;
  lat?: number;
  lng?: number;
  context?: string;
  type?: string;
  description?: string;
  location_type?: string;
  activities?: string[];
  source?: string;
  url?: string;
}

function parseWikipediaPage(html: string, sourceUrl: string): LocationObject[] {
  const $ = load(html);
  const objects: LocationObject[] = [];

  // Парсим основной контент
  const mainContent = $('#mw-content-text').text() || $('article').text() || '';

  // Regex для координат: 56.123, 160.456
  const coordPattern = /(\d{1,2}\.\d{1,6}),\s*(\d{1,3}\.\d{1,6})/g;

  let match;
  const seenCoords = new Set<string>();

  while ((match = coordPattern.exec(mainContent)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const coordKey = `${lat},${lng}`;

    // Пропускаем дубликаты
    if (seenCoords.has(coordKey)) continue;
    seenCoords.add(coordKey);

    // Контекст вокруг координат
    const startIdx = Math.max(0, match.index! - 150);
    const endIdx = Math.min(mainContent.length, match.index! + 150);
    const context = mainContent.substring(startIdx, endIdx);

    // Извлекаем название локации из контекста
    const nameMatch = context.match(/([A-Z][a-z\s]+(?:Volcano|Peak|Bay|Lake|Spring|River|Geyser|Pass)?)/);
    const name = nameMatch ? nameMatch[1].trim() : `Location ${lat},${lng}`;

    // Определяем тип по ключевым словам
    const type = inferLocationType(context);
    const activities = inferActivities(context);

    objects.push({
      name,
      lat,
      lng,
      context,
      location_type: type,
      activities,
      description: context.substring(0, 200),
      source: 'wikipedia',
      url: sourceUrl,
    });
  }

  // Также парсим списки в инфобоксах и таблицах
  $('table.infobox').each((i, el) => {
    const $table = $(el);
    const name = $table.find('th').first().text();

    const coordCell = $table
      .find('td')
      .filter((_, el) => {
        const text = $(el).text();
        return text.includes('.') && text.split('.').length === 4;
      })
      .first();

    if (coordCell.length > 0) {
      const coordText = $(coordCell).text();
      const match = coordText.match(/(\d{1,2})°.*?(\d{1,2}\.\d+).*?N.*?(\d{1,3})°.*?(\d{1,2}\.\d+).*?E/);

      if (match) {
        const lat = parseFloat(match[1]) + parseFloat(match[2]) / 60;
        const lng = parseFloat(match[3]) + parseFloat(match[4]) / 60;

        objects.push({
          name: name.trim(),
          lat,
          lng,
          location_type: 'landmark',
          source: 'wikipedia_infobox',
          url: sourceUrl,
        });
      }
    }
  });

  return objects;
}

function inferLocationType(context: string): string {
  const lower = context.toLowerCase();

  if (lower.includes('volcano') || lower.includes('вулкан')) return 'volcano';
  if (lower.includes('spring') || lower.includes('горячая')) return 'hot_spring';
  if (lower.includes('geyser') || lower.includes('гейзер')) return 'geyser';
  if (lower.includes('bay') || lower.includes('залив')) return 'bay';
  if (lower.includes('lake') || lower.includes('озеро')) return 'lake';
  if (lower.includes('mountain') || lower.includes('гора') || lower.includes('peak')) return 'mountain';
  if (lower.includes('river') || lower.includes('река')) return 'river';
  if (lower.includes('beach') || lower.includes('пляж')) return 'beach';

  return 'other';
}

function inferActivities(context: string): string[] {
  const lower = context.toLowerCase();
  const activities: string[] = [];

  if (lower.includes('hike') || lower.includes('trek') || lower.includes('пешком'))
    activities.push('trekking');
  if (lower.includes('fish') || lower.includes('рыбалка')) activities.push('fishing');
  if (lower.includes('thermal') || lower.includes('горячая')) activities.push('thermal');
  if (lower.includes('boat') || lower.includes('лодка')) activities.push('boat_trip');
  if (lower.includes('helicopter') || lower.includes('вертолет')) activities.push('helicopter');
  if (lower.includes('bear') || lower.includes('медведь')) activities.push('wildlife');
  if (lower.includes('ski') || lower.includes('snowmobile') || lower.includes('снег'))
    activities.push('snowmobile');

  return activities.length > 0 ? activities : ['sightseeing'];
}
