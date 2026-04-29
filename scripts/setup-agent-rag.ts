#!/usr/bin/env node
/**
 * Сборка базы знаний для агентов из инкрементной таблицы agent_route_knowledge.
 * Если таблица не заполнена, используется fallback на единый view v_kamchatka_routes_api.
 *
 * Запуск:
 *   node scripts/sync-agent-route-knowledge.js
 *   npx ts-node scripts/setup-agent-rag.ts
 */

import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL не установлена в .env.local');
}

interface RouteRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  lat: number | null;
  lng: number | null;
  source_url: string | null;
  source_name: string | null;
  payload?: Record<string, unknown>;
  search_text?: string;
}

interface KnowledgeTour {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  coordinates: [number, number] | null;
  district: string | null;
  length_km: number | null;
  source_url: string | null;
  source_name: string | null;
  searchText: string;
  metadata: {
    category: string;
    coordinates?: [number, number];
    source_url?: string;
    source_name?: string;
  };
}

function buildSearchText(route: RouteRow): string {
  const parts = [
    route.title,
    `Категория: ${route.category}`,
    route.description || '',
    route.source_name ? `Источник: ${route.source_name}` : '',
    route.lat !== null && route.lng !== null ? `Координаты: ${route.lat}, ${route.lng}` : '',
  ].filter(Boolean);

  return parts.join('\n');
}

function toKnowledgeTour(route: RouteRow): KnowledgeTour {
  const coordinates =
    route.lat !== null && route.lng !== null ? ([route.lat, route.lng] as [number, number]) : null;

  const searchText = route.search_text || buildSearchText(route);

  return {
    id: route.id,
    name: route.title,
    description: route.description || '',
    category: route.category,
    difficulty: 'Не указано',
    duration: 'Не указано',
    coordinates,
    district: null,
    length_km: null,
    source_url: route.source_url || null,
    source_name: route.source_name || null,
    searchText,
    metadata: {
      category: route.category,
      ...(coordinates ? { coordinates } : {}),
      ...(route.source_url ? { source_url: route.source_url } : {}),
      ...(route.source_name ? { source_name: route.source_name } : {}),
    },
  };
}

async function loadRoutes(pool: { query: (sql: string) => Promise<{ rows: RouteRow[] }> }) {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(route_id::text, route_dedupe_key) AS id,
        title,
        description,
        category,
        lat,
        lng,
        source_url,
        source_name,
        payload,
        search_text
      FROM agent_route_knowledge
      ORDER BY category, title
    `);

    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch {
    // Fallback ниже, если таблица agent_route_knowledge еще не создана.
  }

  const fallbackResult = await pool.query(`
    SELECT
      route_id::text AS id,
      title,
      description,
      category,
      lat,
      lng,
      source_url,
      source_name,
      metadata AS payload,
      NULL::text AS search_text
    FROM v_kamchatka_routes_api
    ORDER BY category, category_position
  `);

  return fallbackResult.rows;
}

async function saveForCrewAI(tours: KnowledgeTour[]) {
  const crewaiData = {
    timestamp: new Date().toISOString(),
    total: tours.length,
    categories: [...new Set(tours.map((tour) => tour.category))],
    tours,
  };

  writeFileSync('crew/knowledge-base.json', JSON.stringify(crewaiData, null, 2));
}

async function main() {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const routes = await loadRoutes(pool);
    const tours = routes.map(toKnowledgeTour);

    await saveForCrewAI(tours);

    const byCategory = tours.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(byCategory).forEach(([category, count]) => {
    });
  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
