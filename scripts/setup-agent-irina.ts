/**
 * Setup Script: Create Ирина agent account
 *
 * Usage:
 *   npx ts-node scripts/setup-agent-irina.ts
 *
 * Or compiled:
 *   node scripts/setup-agent-irina.js
 *
 * Prerequisites:
 *   - DATABASE_URL env var set
 *   - psql client or pg driver available
 */

import { pool } from '../lib/db-pool';
import { hashPassword } from '../lib/auth/password';

const AGENT_EMAIL = 'kamlandinfo@yandex.ru';
const AGENT_NAME = 'Ирина (YaKamchatka)';
const TEMP_PASSWORD = 'TempPass2026!';

async function setupAgentIrina() {
  console.log('🚀 Setting up Ирина agent account...\n');

  try {
    // Check if user exists
    const existingResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [AGENT_EMAIL.toLowerCase()]
    );

    if (existingResult.rows.length > 0) {
      console.log('⚠️  User already exists with ID:', existingResult.rows[0].id);
      process.exit(0);
    }

    // Hash the temporary password
    console.log('🔐 Hashing temporary password...');
    const hashedPassword = await hashPassword(TEMP_PASSWORD);

    // Create the agent user
    console.log('📝 Creating agent account...');
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, preferences, pd_consent_at, pd_consent_ip, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), $6, NOW(), NOW())
       RETURNING id, email, name, role, created_at`,
      [
        AGENT_EMAIL.toLowerCase(),
        hashedPassword,
        AGENT_NAME,
        'agent',
        JSON.stringify({ roles: ['agent'] }),
        '127.0.0.1', // Script-created user
      ]
    );

    const user = result.rows[0];

    console.log('\n✅ Agent account created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User ID:    ', user.id);
    console.log('Email:      ', user.email);
    console.log('Name:       ', user.name);
    console.log('Role:       ', user.role);
    console.log('Created:    ', user.created_at);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📌 Credentials for Ирина:');
    console.log('   Email:    kamlandinfo@yandex.ru');
    console.log('   Password: TempPass2026! (change on first login)');
    console.log('   Login:    /auth/signin');
    console.log('   Hub:      /hub/agent\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
setupAgentIrina();
