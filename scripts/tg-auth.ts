#!/usr/bin/env tsx
/**
 * scripts/tg-auth.ts
 *
 * Одноразовый скрипт: авторизация Telegram-аккаунта через MTProto.
 * Сохраняет StringSession в .env.local (TG_USER_SESSION).
 *
 * Запуск:
 *   npx tsx scripts/tg-auth.ts
 *
 * Требует в .env.local:
 *   TG_API_ID=...      # https://my.telegram.org/apps
 *   TG_API_HASH=...    # https://my.telegram.org/apps
 *   TG_PHONE=+7...     # Номер телефона (с кодом страны)
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_ID   = parseInt(process.env.TG_API_ID   ?? '0', 10);
const API_HASH = process.env.TG_API_HASH ?? '';
const PHONE    = process.env.TG_PHONE    ?? '';

if (!API_ID || !API_HASH || !PHONE) {
  console.error('Заполните TG_API_ID, TG_API_HASH, TG_PHONE в .env.local');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

async function main() {
  const client = new TelegramClient(new StringSession(''), API_ID, API_HASH, {
    connectionRetries: 3,
  });

  await client.start({
    phoneNumber: async () => PHONE,
    phoneCode:   async () => ask('Код из SMS / Telegram: '),
    password:    async () => ask('Пароль 2FA (если есть, иначе Enter): '),
    onError: (err) => { process.stderr.write('Ошибка: ' + err.message + '\n'); },
  });

  const session = (client.session as StringSession).save();
  process.stdout.write('\nStringSession:\n' + session + '\n\n');

  // Записываем в .env.local
  const envPath = path.resolve('.env.local');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (envContent.includes('TG_USER_SESSION=')) {
    envContent = envContent.replace(/^TG_USER_SESSION=.*$/m, `TG_USER_SESSION="${session}"`);
  } else {
    envContent += `\nTG_USER_SESSION="${session}"\n`;
  }
  fs.writeFileSync(envPath, envContent);
  process.stdout.write('TG_USER_SESSION сохранён в .env.local\n');

  await client.disconnect();
  rl.close();
}

main().catch(e => { process.stderr.write(String(e) + '\n'); process.exit(1); });
