/**
 * tourhab-dev MCP Server
 * Implements JSON-RPC 2.0 over stdio — no external SDK needed.
 *
 * Tools:
 *   next_migration_id   — next available migration number
 *   sql_rules           — mandatory SQL conventions for this project
 *   check_protected     — is a file in the НЕ ТРОГАТЬ list?
 */
import { createInterface } from 'readline';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env.local') });

const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

// cwd is set to repo root via .mcp.json
const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = join(REPO_ROOT, 'migrations');
const CLAUDE_MD = join(REPO_ROOT, 'CLAUDE.md');

const PROTECTED_PATHS = [
  'middleware.ts',
  'lib/auth.ts',
  'app/api/payments/',
  'app/api/safety/sos',
];

const TOOLS = [
  {
    name: 'next_migration_id',
    description:
      'Returns the next available migration number based on files in migrations/. ' +
      'Call this BEFORE creating any new migration.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'sql_rules',
    description:
      'Returns mandatory SQL conventions: forbidden table names, correct column aliases, ' +
      'import paths, pool import pattern. Call before writing any SQL.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'check_protected',
    description:
      'Check if a file path is in the protected НЕ ТРОГАТЬ list from CLAUDE.md.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative path to check (e.g. "app/api/payments/route.ts")',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'brain_search',
    description:
      'Search agent knowledge pages using Russian FTS. Returns ranked results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (Russian or English)' },
        type: { type: 'string', description: 'Filter by page type (operator, route, intel, decision, pattern)' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'brain_get',
    description: 'Get a single knowledge page by slug, including links.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug (e.g. "operators/fishingkam")' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'brain_upsert',
    description:
      'Create or update a knowledge page. Overwrites compiled_truth, merges metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Unique slug' },
        type: { type: 'string', description: 'Page type (operator, route, intel, decision, pattern)' },
        title: { type: 'string', description: 'Page title' },
        compiled_truth: { type: 'string', description: 'Current summary (overwritten)' },
        metadata: { type: 'object', description: 'JSONB metadata (merged)' },
        agent_id: { type: 'string', description: 'Author agent ID' },
      },
      required: ['slug', 'type', 'title', 'compiled_truth'],
    },
  },
  {
    name: 'brain_timeline',
    description:
      'Append an entry to a knowledge page timeline (append-only chronology).',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug' },
        entry: { type: 'string', description: 'Timeline entry text' },
      },
      required: ['slug', 'entry'],
    },
  },
  {
    name: 'brain_list',
    description: 'List knowledge pages with optional type/agent filter.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filter by page type' },
        agent_id: { type: 'string', description: 'Filter by agent ID' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
];

function nextMigrationId(): unknown {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_/.test(f))
    .map((f) => parseInt(f.split('_')[0], 10))
    .filter((n) => !isNaN(n));
  const maxId = files.length > 0 ? Math.max(...files) : 0;
  const nextId = maxId + 1;
  const pad = (n: number) => String(n).padStart(3, '0');
  return {
    next_id: nextId,
    next_prefix: `${pad(nextId)}_`,
    example: `${pad(nextId)}_your_description.sql`,
    last_migration: `${pad(maxId)}_`,
    total_migrations: files.length,
  };
}

function sqlRules(): unknown {
  return {
    forbidden_tables: {
      'FROM bookings': 'Use FROM operator_bookings',
      'FROM tours':
        'Use FROM operator_tours (or v_kamchatka_routes_api for public routes)',
      'SELECT *': 'Always list explicit columns',
    },
    column_corrections: {
      status: 'booking_status (in operator_bookings)',
      total_price: 'final_price (in operator_bookings)',
      group_size: 'participants (in operator_bookings)',
    },
    pool_import: "import { pool } from '@/lib/db-pool'  — named export, NOT default",
    parameterization: 'Always use $1, $2 placeholders — never string concatenation',
    operator_tables_in_prod: [
      'operator_staff (migration 050)',
      'operator_ai_config (migration 053)',
      'operator_ai_actions (migration 055)',
    ],
    hint: 'Use next_migration_id tool to get the current last migration number',
  };
}

function checkProtected(filePath: string): unknown {
  const normalised = filePath
    .replace(/^\/workspaces\/PosPkTry\//, '')
    .replace(/^\.\//, '');
  const isProtected = PROTECTED_PATHS.some(
    (p) => normalised === p || normalised.startsWith(p),
  );

  let claudeMdSection = '';
  try {
    const md = readFileSync(CLAUDE_MD, 'utf-8');
    const match = md.match(/## 7\. НЕ ТРОГАТЬ[\s\S]*?(?=\n## |\n---\n|$)/);
    if (match) claudeMdSection = match[0].trim();
  } catch {
    // ignore
  }

  return {
    file: normalised,
    is_protected: isProtected,
    protected_paths: PROTECTED_PATHS,
    claude_md_section: claudeMdSection || '(could not read CLAUDE.md)',
  };
}

// ── Brain tools ────────────────────────────────────────────────

async function brainSearch(args: Record<string, unknown>): Promise<unknown> {
  const query = String(args.query ?? '');
  const type = args.type ? String(args.type) : undefined;
  const limit = typeof args.limit === 'number' ? args.limit : 10;

  const conditions: string[] = [`search_vector @@ plainto_tsquery('russian', $1)`];
  const params: unknown[] = [query, limit];
  let paramIdx = 3;
  if (type) {
    conditions.push(`type = $${paramIdx++}`);
    params.push(type);
  }

  const { rows } = await dbPool.query(
    `SELECT slug, type, title,
            LEFT(compiled_truth, 300) AS compiled_truth_preview,
            agent_id, edit_count, updated_at::text,
            ts_rank(search_vector, plainto_tsquery('russian', $1)) AS rank
     FROM agent_knowledge
     WHERE ${conditions.join(' AND ')}
     ORDER BY rank DESC
     LIMIT $2`,
    params
  );

  if (rows.length === 0) {
    // ILIKE fallback
    const ilike = `%${query}%`;
    const fParams: unknown[] = [ilike, limit];
    const fConds = ['(title ILIKE $1 OR compiled_truth ILIKE $1)'];
    let fIdx = 3;
    if (type) {
      fConds.push(`type = $${fIdx++}`);
      fParams.push(type);
    }
    const { rows: fRows } = await dbPool.query(
      `SELECT slug, type, title,
              LEFT(compiled_truth, 300) AS compiled_truth_preview,
              agent_id, edit_count, updated_at::text
       FROM agent_knowledge
       WHERE ${fConds.join(' AND ')}
       ORDER BY updated_at DESC
       LIMIT $2`,
      fParams
    );
    return { results: fRows, method: 'ilike_fallback' };
  }

  return { results: rows, method: 'fts' };
}

async function brainGet(args: Record<string, unknown>): Promise<unknown> {
  const slug = String(args.slug ?? '');
  const { rows } = await dbPool.query(
    `SELECT id, slug, type, title, compiled_truth, timeline,
            metadata, agent_id, edit_count,
            created_at::text, updated_at::text
     FROM agent_knowledge WHERE slug = $1`,
    [slug]
  );
  if (rows.length === 0) return { error: 'not_found', slug };

  const { rows: links } = await dbPool.query(
    `SELECT from_slug, to_slug, link_type, context
     FROM agent_knowledge_links
     WHERE from_slug = $1 OR to_slug = $1`,
    [slug]
  );

  return { page: rows[0], links };
}

async function brainUpsert(args: Record<string, unknown>): Promise<unknown> {
  const slug = String(args.slug ?? '');
  const type = String(args.type ?? '');
  const title = String(args.title ?? '');
  const compiledTruth = String(args.compiled_truth ?? '');
  const metadata = (args.metadata as Record<string, unknown>) ?? {};
  const agentId = args.agent_id ? String(args.agent_id) : null;

  const { rows } = await dbPool.query(
    `INSERT INTO agent_knowledge (slug, type, title, compiled_truth, metadata, agent_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (slug) DO UPDATE SET
       type = EXCLUDED.type,
       title = EXCLUDED.title,
       compiled_truth = EXCLUDED.compiled_truth,
       metadata = agent_knowledge.metadata || EXCLUDED.metadata,
       agent_id = COALESCE(EXCLUDED.agent_id, agent_knowledge.agent_id),
       edit_count = agent_knowledge.edit_count + 1
     RETURNING slug, type, title, edit_count, updated_at::text`,
    [slug, type, title, compiledTruth, JSON.stringify(metadata), agentId]
  );

  return { upserted: rows[0] };
}

async function brainTimeline(args: Record<string, unknown>): Promise<unknown> {
  const slug = String(args.slug ?? '');
  const entry = String(args.entry ?? '');
  const timestamp = new Date().toISOString().slice(0, 16);
  const line = `\n[${timestamp}] ${entry}`;

  const result = await dbPool.query(
    `UPDATE agent_knowledge
     SET timeline = timeline || $2,
         edit_count = edit_count + 1
     WHERE slug = $1`,
    [slug, line]
  );

  return { updated: (result.rowCount ?? 0) > 0, slug };
}

async function brainList(args: Record<string, unknown>): Promise<unknown> {
  const type = args.type ? String(args.type) : undefined;
  const agentId = args.agent_id ? String(args.agent_id) : undefined;
  const limit = typeof args.limit === 'number' ? args.limit : 20;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (type) {
    conditions.push(`type = $${paramIdx++}`);
    params.push(type);
  }
  if (agentId) {
    conditions.push(`agent_id = $${paramIdx++}`);
    params.push(agentId);
  }
  params.push(limit);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await dbPool.query(
    `SELECT slug, type, title,
            LEFT(compiled_truth, 200) AS compiled_truth_preview,
            agent_id, edit_count, updated_at::text
     FROM agent_knowledge
     ${where}
     ORDER BY updated_at DESC
     LIMIT $${paramIdx}`,
    params
  );

  return { pages: rows, total: rows.length };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'next_migration_id':
      return nextMigrationId();
    case 'sql_rules':
      return sqlRules();
    case 'check_protected':
      return checkProtected(String(args.file_path ?? ''));
    case 'brain_search':
      return brainSearch(args);
    case 'brain_get':
      return brainGet(args);
    case 'brain_upsert':
      return brainUpsert(args);
    case 'brain_timeline':
      return brainTimeline(args);
    case 'brain_list':
      return brainList(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC 2.0 over stdio
const rl = createInterface({ input: process.stdin });

rl.on('line', async (line) => {
  let request: { jsonrpc: string; id: unknown; method: string; params?: unknown };
  try {
    request = JSON.parse(line);
  } catch {
    return; // ignore malformed input
  }

  const respond = (result: unknown) => {
    process.stdout.write(
      JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n',
    );
  };
  const respondError = (code: number, message: string) => {
    process.stdout.write(
      JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code, message } }) + '\n',
    );
  };

  try {
    switch (request.method) {
      case 'initialize':
        respond({
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'tourhab-dev-tools', version: '1.1.0' },
        });
        break;

      case 'notifications/initialized':
        // no response needed for notifications
        break;

      case 'tools/list':
        respond({ tools: TOOLS });
        break;

      case 'tools/call': {
        const p = request.params as { name: string; arguments?: Record<string, unknown> };
        const result = await callTool(p.name, p.arguments ?? {});
        respond({
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
        break;
      }

      default:
        respondError(-32601, `Method not found: ${request.method}`);
    }
  } catch (err) {
    respondError(-32603, (err as Error).message);
  }
});
