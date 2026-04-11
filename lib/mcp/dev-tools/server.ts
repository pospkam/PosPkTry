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

function callTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case 'next_migration_id':
      return nextMigrationId();
    case 'sql_rules':
      return sqlRules();
    case 'check_protected':
      return checkProtected(String(args.file_path ?? ''));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC 2.0 over stdio
const rl = createInterface({ input: process.stdin });

rl.on('line', (line) => {
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
          serverInfo: { name: 'tourhab-dev-tools', version: '1.0.0' },
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
        const result = callTool(p.name, p.arguments ?? {});
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
