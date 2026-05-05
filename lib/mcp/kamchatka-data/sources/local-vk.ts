import axios from 'axios';
import { load } from 'cheerio';

export async function parseLocalIncidents(limit: number = 20): Promise<unknown[]> {
  // VK пабликы Камчатки с происшествиями
  // Также Telegram каналы местных новостей

  const sources = [
    {
      type: 'vk',
      id: 'kamchatka_news', // Новости Камчатки
    },
    {
      type: 'vk',
      id: 'kamchatka_incidents', // Происшествия Камчатки
    },
    {
      type: 'vk',
      id: 'petropavlovsk_news', // Новости ПКО
    },
    {
      type: 'tg',
      id: 'kamchatka_travel', // Путешественники Камчатки
    },
  ];

  const incidents: unknown[] = [];

  for (const source of sources) {
    try {
      let url: string;
      let parseFunc: (html: string, source: string) => unknown[];

      if (source.type === 'vk') {
        // VK через web interface
        url = `https://vk.com/${source.id}?w=wall`;
        parseFunc = parseVkPosts;
      } else {
        // Telegram
        url = `https://t.me/s/${source.id}`;
        parseFunc = parseTgPosts;
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const parsed = parseFunc(response.data, source.id);
      incidents.push(...parsed);

      if (incidents.length >= limit) break;
    } catch (error) {
    }
  }

  return incidents.slice(0, limit);
}

function parseVkPosts(html: string, community: string): unknown[] {
  const $ = load(html);
  const posts: unknown[] = [];

  $('div.post').each((i, el) => {
    if (i > 5) return; // последние 5 постов

    const $el = $(el);
    const text = $el.find('div.wall_post_text').text();
    const timestamp = $el.find('a.rel_date').text();

    if (containsIncidentKeywords(text)) {
      posts.push({
        source: `vk/${community}`,
        text: text.substring(0, 500),
        timestamp,
        url: `https://vk.com/${community}`,
        fetched_at: new Date().toISOString(),
        keywords: extractKeywords(text),
      });
    }
  });

  return posts;
}

function parseTgPosts(html: string, channel: string): unknown[] {
  const $ = load(html);
  const posts: unknown[] = [];

  $('div[class*="message"]').each((i, el) => {
    if (i > 5) return;

    const $el = $(el);
    const text = $el.find('div.tgme_widget_message_text').text() || $el.text();
    const timestamp = $el.find('a.tgme_widget_message_date').text();

    if (containsIncidentKeywords(text)) {
      posts.push({
        source: `tg/${channel}`,
        text: text.substring(0, 500),
        timestamp,
        url: `https://t.me/s/${channel}`,
        fetched_at: new Date().toISOString(),
        keywords: extractKeywords(text),
      });
    }
  });

  return posts;
}

function containsIncidentKeywords(text: string): boolean {
  const keywords = [
    'авария',
    'травма',
    'медведь',
    'медведи',
    'дорога',
    'закрыто',
    'снег',
    'лавина',
    'оползень',
    'безопасность',
    'опасно',
    'затерялся',
    'спасение',
    'помощь',
    'МЧС',
    'ДТП',
    'дорожное происшествие',
  ];

  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function extractKeywords(text: string): string[] {
  const keywords = ['авария', 'медведь', 'дорога', 'лавина', 'оползень', 'безопасность', 'спасение'];
  return keywords.filter((kw) => text.toLowerCase().includes(kw));
}
