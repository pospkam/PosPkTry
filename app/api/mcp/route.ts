/**
 * MCP Server (Streamable HTTP) для Timeweb Cloud AI Agent
 * Протокол: JSON-RPC 2.0 (MCP spec)
 * Даёт агенту доступ к 259 маршрутам Камчатки в реальном времени
 *
 * URL: https://tourhab.ru/api/mcp
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// ── MCP Tool definitions ─────────────────────────────────────
const TOOLS = [
  {
    name: 'search_routes',
    description: 'Поиск туристических маршрутов Камчатки по категории или ключевым словам',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Категория: vulkani, geyzery, termalnye_istochniki, rybalka, medvedi, morskie_progulki, vertoletnye_tury, trekking, snegohod, dzhip, ozera, gory, reki, eko, kombo',
        },
        query: {
          type: 'string',
          description: 'Поисковый запрос (название или описание)',
        },
        limit: {
          type: 'number',
          description: 'Максимальное количество результатов (по умолчанию 5)',
        },
      },
    },
  },
  {
    name: 'get_route_details',
    description: 'Получить подробную информацию о конкретном маршруте по ID',
    inputSchema: {
      type: 'object' as const,
      properties: {
        route_id: { type: 'string', description: 'UUID маршрута' },
      },
      required: ['route_id'],
    },
  },
  {
    name: 'list_categories',
    description: 'Список всех 14 категорий маршрутов с количеством',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_tours',
    description: 'Получить коммерческие туры с ценами и ближайшими датами отправления',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Фильтр по категории' },
        limit: { type: 'number', description: 'Кол-во туров (по умолчанию 5)' },
      },
    },
  },
];

// ── Tool handlers ────────────────────────────────────────────
async function searchRoutes(args: Record<string, unknown>): Promise<string> {
  const category = typeof args.category === 'string' ? args.category : null;
  const searchQuery = typeof args.query === 'string' ? args.query : null;
  const limit = typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5;

  let sql = `
    SELECT id, title, category, description, source_url,
           payload->>'difficulty' as difficulty,
           payload->>'duration' as duration,
           payload->>'season' as season,
           payload->>'price_from' as price_from
    FROM agent_route_knowledge
    WHERE is_visible = TRUE
  `;
  const params: (string | number)[] = [];
  let idx = 1;

  if (category) {
    sql += ` AND category = $${idx++}`;
    params.push(category);
  }
  if (searchQuery) {
    sql += ` AND (title ILIKE $${idx} OR description ILIKE $${idx})`;
    params.push(`%${searchQuery}%`);
    idx++;
  }
  sql += ` ORDER BY title LIMIT $${idx}`;
  params.push(limit);

  const result = await query<{
    id: string; title: string; category: string;
    description: string | null; difficulty: string | null;
    duration: string | null; season: string | null;
    price_from: string | null; source_url: string | null;
  }>(sql, params);

  if (!result.rows.length) return 'Маршруты не найдены.';

  return result.rows.map(r =>
    `**${r.title}** (${r.category})\n` +
    (r.description ? r.description.slice(0, 200) + '...\n' : '') +
    [r.difficulty && `Сложность: ${r.difficulty}`,
     r.duration && `Длительность: ${r.duration}`,
     r.season && `Сезон: ${r.season}`,
     r.price_from && `От: ${r.price_from} ₽`,
    ].filter(Boolean).join(' | ')
  ).join('\n\n');
}

async function getRouteDetails(args: Record<string, unknown>): Promise<string> {
  const routeId = String(args.route_id);
  const result = await query<{
    id: string; title: string; category: string;
    description: string | null; difficulty: string | null;
    duration: string | null; season: string | null; price_from: string | null;
    highlights: string | null; source_url: string | null;
  }>(
    `SELECT id, title, category, description, source_url,
            payload->>'difficulty' as difficulty,
            payload->>'duration' as duration,
            payload->>'season' as season,
            payload->>'price_from' as price_from,
            payload->>'highlights' as highlights
     FROM agent_route_knowledge WHERE id = $1 AND is_visible = TRUE LIMIT 1`,
    [routeId]
  );

  if (!result.rows.length) return `Маршрут с ID "${routeId}" не найден.`;
  const r = result.rows[0];

  return [
    `# ${r.title}`,
    `Категория: ${r.category}`,
    r.difficulty ? `Сложность: ${r.difficulty}` : null,
    r.duration ? `Длительность: ${r.duration}` : null,
    r.season ? `Лучший сезон: ${r.season}` : null,
    r.price_from ? `Цена от: ${r.price_from} ₽` : null,
    r.description ? `\n${r.description}` : null,
    r.source_url ? `\nПодробнее: ${r.source_url}` : null,
  ].filter(Boolean).join('\n');
}

async function listCategories(): Promise<string> {
  const result = await query<{ category: string; count: string }>(
    `SELECT category, COUNT(*) as count FROM agent_route_knowledge WHERE is_visible = TRUE GROUP BY category ORDER BY count DESC`
  );

  const labels: Record<string, string> = {
    eco: 'Эко-туры', vulkani: 'Вулканы', trekking: 'Треккинг',
    termalnye_istochniki: 'Термальные источники', mountains: 'Горы',
    morskie_progulki: 'Морские прогулки', lakes: 'Озёра',
    rybalka: 'Рыбалка', geyzery: 'Гейзеры', dzhip: 'Джип-туры',
    snegohod: 'Снегоходы', rivers: 'Реки',
    vertoletnye_tury: 'Вертолётные туры', medvedi: 'Медведи',
  };

  return result.rows
    .map(r => `- ${labels[r.category] || r.category} (${r.count} маршрутов)`)
    .join('\n');
}

async function getTours(args: Record<string, unknown>): Promise<string> {
  const category = typeof args.category === 'string' ? args.category : null;
  const limit = typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5;

  let sql = `
    SELECT t.id, t.title, t.description, t.price, t.duration_days,
           td.start_date, td.available_slots, td.price_override
    FROM tours t
    LEFT JOIN tour_departures td ON td.tour_id = t.id AND td.status = 'open'
      AND td.start_date >= CURRENT_DATE
    WHERE t.status = 'active'
  `;
  const params: (string | number)[] = [];
  let idx = 1;

  if (category) {
    sql += ` AND t.category = $${idx++}`;
    params.push(category);
  }
  sql += ` ORDER BY t.title, td.start_date LIMIT $${idx}`;
  params.push(limit);

  const result = await query<{
    id: string; title: string; description: string | null;
    price: string | null; duration_days: number | null;
    start_date: Date | null; available_slots: number | null;
    price_override: string | null;
  }>(sql, params);

  if (!result.rows.length) return 'Активные туры не найдены.';

  return result.rows.map(r => {
    const price = r.price_override || r.price;
    const date = r.start_date ? r.start_date.toLocaleDateString('ru-RU') : null;
    return `**${r.title}**\n` +
      [price && `Цена: ${price} ₽`,
       r.duration_days && `Дней: ${r.duration_days}`,
       date && `Ближайший заезд: ${date}`,
       r.available_slots && `Мест: ${r.available_slots}`,
      ].filter(Boolean).join(' | ');
  }).join('\n\n');
}

// ── Execute tool by name ─────────────────────────────────────
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'search_routes': return searchRoutes(args);
    case 'get_route_details': return getRouteDetails(args);
    case 'list_categories': return listCategories();
    case 'get_tours': return getTours(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC helpers ─────────────────────────────────────────
interface JsonRpcRequest {
  jsonrpc?: string;
  method?: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

function jsonrpcSuccess(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function jsonrpcError(id: string | number | null | undefined, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

// ── MCP Protocol: GET = server info ──────────────────────────
export async function GET() {
  return NextResponse.json({
    name: 'kamchatour-mcp',
    version: '1.0.0',
    description: 'KamchatourHub — 260 маршрутов и туры Камчатки',
    tools: TOOLS,
  });
}

// ── MCP Protocol: POST = JSON-RPC 2.0 ───────────────────────
export async function POST(request: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await request.json() as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      jsonrpcError(null, -32700, 'Parse error'),
      { status: 400 }
    );
  }

  const { method, params, id } = body;

  try {
    switch (method) {
      // ── initialize handshake ──
      case 'initialize':
        return NextResponse.json(jsonrpcSuccess(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'kamchatour-mcp',
            version: '1.0.0',
          },
        }));

      // ── client acknowledged init ──
      case 'notifications/initialized':
        return NextResponse.json(jsonrpcSuccess(id, {}));

      // ── list available tools ──
      case 'tools/list':
        return NextResponse.json(jsonrpcSuccess(id, { tools: TOOLS }));

      // ── call a tool ──
      case 'tools/call': {
        const toolName = typeof params?.name === 'string' ? params.name : '';
        const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;

        try {
          const text = await executeTool(toolName, toolArgs);
          return NextResponse.json(jsonrpcSuccess(id, {
            content: [{ type: 'text', text }],
          }));
        } catch (toolErr) {
          const msg = toolErr instanceof Error ? toolErr.message : 'Tool execution failed';
          return NextResponse.json(jsonrpcSuccess(id, {
            content: [{ type: 'text', text: msg }],
            isError: true,
          }));
        }
      }

      // ── ping/pong ──
      case 'ping':
        return NextResponse.json(jsonrpcSuccess(id, {}));

      // ── unknown method ──
      default:
        return NextResponse.json(
          jsonrpcError(id, -32601, `Method not found: ${method}`),
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      jsonrpcError(id, -32603, msg),
      { status: 500 }
    );
  }
}
