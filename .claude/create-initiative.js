const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('🔌 Connecting to database...');
    const conn = await pool.connect();

    console.log('✅ Connected. Creating test initiative...');

    const result = await conn.query(`
      INSERT INTO agent_approvals (
        action_type,
        description,
        status,
        execution_status,
        requested_by,
        context,
        executor_agent_id,
        executor_name
      ) VALUES (
        'archive_sos',
        'Архивировать SOS-события старше 24 часов (тестовый запуск)',
        'approved',
        'assigned',
        'rescue',
        jsonb_build_object('reason', 'Автоматическая архивация зависших SOS', 'test', true),
        'rescue',
        'Rescue Agent'
      )
      RETURNING id, action_type, status, execution_status, created_at;
    `);

    const row = result.rows[0];
    console.log('\n✅ Initiative created:');
    console.log(`   ID: ${row.id}`);
    console.log(`   Type: ${row.action_type}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Execution: ${row.execution_status}`);
    console.log(`   Created: ${row.created_at}`);

    conn.release();
    pool.end();

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Details:', err);
    process.exit(1);
  }
})();
