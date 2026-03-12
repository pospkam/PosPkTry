/**
 * MCP Server для Timeweb Cloud AI Agent
 * Даёт агенту доступ к 259 маршрутам Камчатки в реальном времени
 *
 * URL для регистрации в Timeweb: https://pospkam-pospktry-c1f3.twc1.net/api/mcp
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
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Категория: vulkani, geyzery, termalnye_istochniki, rybalka, snegohod, dzhip, morskie_progulki, trekking, lakes, mountains, rivers, medvedi, vertoletnye_tury, eco',
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
    description: 'Получить подробную информацию о конкретном маршруте',
    inputSchema: {
      type: 'object',
      properties: {
        route_id: {
          type: 'string',
          description: 'ID маршрута',
        },
      },
      required: ['route_id'],
    },
  },
  {
    name: 'list_categories',
    description: 'Список всех категорий маршрутов с количеством',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_tours',
    description: 'Получить коммерческие туры с ценами и датами отправления',
    inputSchema: {
      type: 'object',
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
    SELECT id, title, category, description, difficulty, duration, season, price_from, source_url
    FROM agent_route_knowledge
    WHERE 1=1
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
    coordinates: unknown; highlights: unknown; source_url: string | null;
  }>(
    `SELECT * FROM agent_route_knowledge WHERE id = $1 LIMIT 1`,
    [routeId]
  );

  if (!result.rows.length) return `Маршрут с ID "${routeId}" не найден.`;
  const r = result.rows[0];

  const lines = [
    `# ${r.title}`,
    `Категория: ${r.category}`,
    r.difficulty ? `Сложность: ${r.difficulty}` : null,
    r.duration ? `Длительность: ${r.duration}` : null,
    r.season ? `Лучший сезон: ${r.season}` : null,
    r.price_from ? `Цена от: ${r.price_from} ₽` : null,
    r.description ? `\n${r.description}` : null,
    r.source_url ? `\nПодробнее: ${r.source_url}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

async function listCategories(): Promise<string> {
  const result = await query<{ category: string; count: string }>(
    `SELECT category, COUNT(*) as count FROM agent_route_knowledge GROUP BY category ORDER BY count DESC`
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

// ── MCP Protocol handlers ────────────────────────────────────

// GET /api/mcp — server info + tools list (MCP discovery)
export async function GET() {
  return NextResponse.json({
    name: 'kamchatour-mcp',
    version: '1.0.0',
    description: 'KamchatourHub — маршруты и туры Камчатки',
    tools: TOOLS,
  });
}

// POST /api/mcp — execute tool call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      tool?: string;
      name?: string;
      arguments?: Record<string, unknown>;
      input?: Record<string, unknown>;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };

    // Support multiple MCP call formats
    const toolName = body.tool || body.name || body.params?.name || '';
    const toolArgs = body.arguments || body.input || body.params?.arguments || {};

    let result: string;
    switch (toolName) {
      case 'search_routes':
        result = await searchRoutes(toolArgs);
        break;
      case 'get_route_details':
        result = await getRouteDetails(toolArgs);
        break;
      case 'list_categories':
        result = await listCategories();
        break;
      case 'get_tours':
        result = await getTours(toolArgs);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${toolName}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      content: [{ type: 'text', text: result }],
    });
  } catch (err) {
    console.error('[MCP] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
