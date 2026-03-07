import 'dotenv/config';
import { Bot } from 'tgbotapi';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Client } = pkg;

const bot = new Bot({ token: process.env.TELEGRAM_TOKEN });

// PostgreSQL client for RAG (chat history)
const db = new Client({ connectionString: process.env.POSTGRES_URL });
await db.connect().catch(() => {}); // ignore if not set

// Basic Claude/Grok/OpenAI proxy
async function askAI(text, userId) {
  // Claude (пример)
  if (process.env.CLAUDE_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 512,
          messages: [{ role: 'user', content: text }],
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text || 'Нет ответа от Claude.';
    } catch (e) {}
  }
  // Fallback: Grok/OpenAI
  return 'AI недоступен.';
}

// Handle text messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.message.from.id;
  // Сохраняем в историю (RAG)
  if (db.connectionParameters) {
    await db.query('INSERT INTO chat_history(user_id, message) VALUES($1, $2)', [userId, text]).catch(() => {});
  }
  // AI-ответ
  const reply = await askAI(text, userId);
  await ctx.reply(reply);
});

bot.start();

console.log('AI-TGBOT запущен!');
