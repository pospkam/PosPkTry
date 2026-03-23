import fs from 'fs';
import path from 'path';
import { pool } from '@/lib/db-pool';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '077_partner_telegram_chat_id.sql'),
      'utf-8'
    );
    await pool.query(sql);
    return Response.json({ success: true, message: 'Migration 077 completed: partners.telegram_chat_id added' });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
