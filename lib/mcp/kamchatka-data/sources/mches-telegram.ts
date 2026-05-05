import axios from 'axios';
import { load } from 'cheerio';

export async function parseMchesAlerts(hoursBack: number = 24): Promise<unknown[]> {
  // МЧС Камчатки публикует в TG канал: @mches_kamchatka, @mches_pks
  // Парсим через RSS или TG Web (не требует API key)

  const mchesChannels = [
    'mches_kamchatka',
    'mches_pks',
    'kamchatka_dtp', // ДТП новости
  ];

  const alerts: unknown[] = [];
  const baseTime = new Date();

  for (const channel of mchesChannels) {
    try {
      // Пример: парсим HTML через web.telegram.org
      // В реальном приложении нужен telegram-bot-api или TG Client
      const url = `https://t.me/s/${channel}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = load(response.data);

      // Парсим посты (обычно в div.tgme_widget_message)
      const posts: unknown[] = [];

      $('div[data-post]').each((i, el) => {
        if (i > 10) return; // Ограничиваем последние 10 постов

        const $el = $(el);
        const text = $el.text();
        const timestamp = $el.find('a.tgme_widget_message_date').attr('href');

        // Фильтруем по ключевым словам МЧС
        if (containsMchesKeywords(text)) {
          posts.push({
            source: channel,
            text: text.substring(0, 500),
            timestamp,
            url,
            fetched_at: new Date().toISOString(),
          });
        }
      });

      alerts.push(...posts);
    } catch (error) {
    }
  }

  return alerts;
}

function containsMchesKeywords(text: string): boolean {
  const keywords = [
    'оповещение',
    'внимание',
    'опасность',
    'закрыто',
    'лавина',
    'оползень',
    'дорога',
    'МЧС',
    'спасение',
    'помощь',
    'опасно',
    'безопасность',
  ];

  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}
