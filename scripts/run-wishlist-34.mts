import { executeInitiative } from '../lib/agents/execution/initiative-executor';
import { pool } from '../lib/db-pool';

const TARGETS = [
  'f644068e-b6c5-4bda-ae76-0398849cf638', // Wishlist #3 — code_change
  '049a8a71-0216-44b6-8c3c-dd974678d3a3', // Wishlist #4 — sql_query_fix
];

async function main() {
  const rows = await pool.query<{
    id: string; action_type: string; description: string;
    context: Record<string, unknown>; executor_agent_id: string | null; due_date: string | null; topic: string;
  }>(
    `SELECT id, action_type, description, context, executor_agent_id, due_date::text, topic
     FROM agent_approvals WHERE id = ANY($1) AND status = 'approved'`,
    [TARGETS]
  );

  for (const row of rows.rows) {
    console.log(`\n--- ${row.topic} (${row.action_type}) ---`);
    const result = await executeInitiative({
      approval_id:       row.id,
      executor_agent_id: row.executor_agent_id ?? 'system',
      action_type:       row.action_type,
      description:       row.description ?? '',
      context:           row.context ?? {},
      due_date:          row.due_date ?? '',
    });
    console.log('Результат:', JSON.stringify(result, null, 2));
  }

  await pool.end();
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
