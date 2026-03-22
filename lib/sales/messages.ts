/**
 * CEO Sales Messages - Honest operator outreach
 * Focus: Their pain, not hype
 */

export const HONEST_SALES_MESSAGES = {
  fishing: `Привет! Видел твой канал про рыбалку на Камчатке.

У тебя есть туры, но они теряются в WhatsApp, туристы не знают о них.

Я запустил платформу KamchatourHub. Там туристы видят туры и сразу платят (нет налички).

Твой календарь синхронизируется, нет двойных бронирований — автоматика.

**В апреле протестируй бесплатно.** Если нравится — остаешься с честной комиссией.

Ссылка: https://tourhab.ru/operator/join

Идея?`,

  trekking: `Привет, ${0}!

Видел твои треки на в ulкан. Здорово.

Проблема: туристы находят тебя случайно, половина букировок теряется в чатах.

KamchatourHub решает это: туристы видят → платят → ты получаешь на счёт (автоматически).

**Первый месяц 0% комиссии.** Просто протестируй.

Если работает — остаешься. Если нет — ничего не потеряешь.

Присоединиться: https://tourhab.ru/operator/join`,

  wildlife: `Привет!

Твои туры (медведи, дикая природа) — это контент, который туристы ищут на Камчатке.

Но сейчас они находят конкурента быстрее, чем тебя.

На KamchatourHub туристы видят ТЕБЯ первым (если твой тур качественный).

Платёж приходит автоматически. Календарь синхронизируется. Ноль забот.

**Апрель — бесплатно.** Просто попробуй.

https://tourhab.ru/operator/join`,

  thermal: `Привет!

Горячие источники — это то, что туристы готовы платить хорошие деньги.

Но твой тур видят только те, кто в твоём чате.

KamchatourHub показывает твой тур туристам, которые ищут именно его.

Они платят → ты получаешь.

**Первый месяц протестируй бесплатно.**

https://tourhab.ru/operator/join`,

  helicopter: `Привет!

Вертолетные туры — премиум-сегмент. На платформе они стоят дорого (3-5K EUR за тур).

Твоя проблема: туристы ищут, но находят конкурента.

На KamchatourHub ты видеошь премиум-туристов, которые готовы платить (и платят).

Ноль скама, честная комиссия.

**Апрель — тестируем бесплатно.**

https://tourhab.ru/operator/join

Обсудим детали?`
};

/**
 * Generate personalized message based on operator type
 */
export function generateMessage(
  operator: {
    name: string;
    tours_count: number;
    category: keyof typeof HONEST_SALES_MESSAGES;
  }
): string {
  const template = HONEST_SALES_MESSAGES[operator.category];
  return template
    ? template.replace('${0}', operator.name.split(' ')[0])
    : HONEST_SALES_MESSAGES.fishing; // fallback
}
