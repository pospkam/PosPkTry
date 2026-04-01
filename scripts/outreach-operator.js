/**
 * Operator Outreach — отправка приглашения оператору через Telegram
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RECIPIENT = process.argv[2] || '@Yroslav_Krilov';

const MESSAGE = `Привет, Ярослав! 👋

Мы платформа TourHub — туристический маркетплейс Камчатки.

Хотим разместить сплавы Екатерины на нашей платформе и продвигать их на:
• Tripster (экскурсии от местных)
• Sputnik8 (туры и активности)
• и другие площадки

Всё бесплатно. Екатерина получает личный кабинет где видит все бронирования в одном месте.

Регистрация за 2 минуты: https://tourhab.ru/hub/auth/register

Выбрать роль → Оператор → заполнить профиль.

Готов ответить на любые вопросы!`;

async function send() {
  if (!BOT_TOKEN) {
    console.log('❌ TELEGRAM_BOT_TOKEN не найден\n');
    console.log('📋 Скопируй и отправь вручную в Telegram @Yroslav_Krilov:\n');
    console.log('─'.repeat(50));
    console.log(MESSAGE);
    console.log('─'.repeat(50));
    return;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: RECIPIENT,
          text: MESSAGE,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await res.json();

    if (data.ok) {
      console.log(`✅ Сообщение отправлено ${RECIPIENT}`);
    } else {
      // Бот не может написать первым — выводим текст для ручной отправки
      console.log(`⚠️  Бот не может написать первым (${data.description})\n`);
      console.log('📋 Отправь вручную в Telegram @Yroslav_Krilov:\n');
      console.log('─'.repeat(50));
      console.log(MESSAGE);
      console.log('─'.repeat(50));
    }
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

send();
