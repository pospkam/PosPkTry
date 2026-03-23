/**
 * GET /api/setup/agent-irina?secret=CRON_SECRET
 *
 * Создаёт аккаунт агента Ирины (kamlandinfo@yandex.ru).
 * Идемпотентно — повторный вызов вернёт существующего пользователя.
 */

import { pool } from '@/lib/db-pool';
import bcrypt from 'bcryptjs';

const AGENT_EMAIL    = 'kamlandinfo@yandex.ru';
const AGENT_NAME     = 'Ирина (YaKamchatka)';
const TEMP_PASSWORD  = 'TempPass2026!';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Проверяем существование
    const existing = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE email = $1',
      [AGENT_EMAIL]
    );

    if (existing.rows.length > 0) {
      return Response.json({
        success: true,
        status: 'already_exists',
        user: existing.rows[0],
        login_url: 'https://tourhab.ru/auth/signin',
        email: AGENT_EMAIL,
        note: 'Аккаунт уже существует. Использовать установленный пароль.',
      });
    }

    // Создаём
    const hash = await bcrypt.hash(TEMP_PASSWORD, 12);

    const result = await pool.query(
      `INSERT INTO users
         (email, password_hash, name, role, preferences, pd_consent_at, pd_consent_ip, created_at, updated_at)
       VALUES ($1, $2, $3, 'agent', $4::jsonb, NOW(), '127.0.0.1', NOW(), NOW())
       RETURNING id, email, name, role, created_at`,
      [
        AGENT_EMAIL,
        hash,
        AGENT_NAME,
        JSON.stringify({ roles: ['agent'] }),
      ]
    );

    return Response.json({
      success: true,
      status: 'created',
      user: result.rows[0],
      login_url: 'https://tourhab.ru/auth/signin',
      email: AGENT_EMAIL,
      temp_password: TEMP_PASSWORD,
      note: 'Попросите Ирину сменить пароль после первого входа.',
    });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
