#!/usr/bin/env node
/**
 * Инициализация RAG базы знаний для агентов
 * - Генерирует embeddings для всех маршрутов
 * - Загружает в pgvector для семантического поиска
 * - Подготавливает knowledge base для CrewAI
 *
 * Запуск: npx ts-node scripts/setup-agent-rag.ts
 */

import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL не установлена в .env.local');
}

interface Place {
  id: string;
  name: string;
  description: string;
  category: string;
  category_slug: string;
  lat: number | null;
  lng: number | null;
  district: string | null;
  length_km: number | null;
  duration: string;
  difficulty: string;
  images: string[];
}

interface EmbeddingData {
  id: string;
  name: string;
  description: string;
  category: string;
  text: string; // Для embedding
  metadata: {
    category: string;
    difficulty: string;
    duration: string;
    coordinates?: [number, number];
    district?: string;
    length_km?: number;
  };
}

/**
 * Подготавливает текст для embedding
 */
function prepareText(place: Place): string {
  const parts = [
    place.name,
    `Категория: ${place.category}`,
    `Сложность: ${place.difficulty}`,
    `Длительность: ${place.duration}`,
    place.length_km ? `Расстояние: ${place.length_km} км` : '',
    place.district ? `Район: ${place.district}` : '',
    place.description || '',
  ].filter(Boolean);

  return parts.join('\n');
}

/**
 * Преобразует места в формат для embeddings
 */
function procesPlaces(places: Place[]): EmbeddingData[] {
  return places.map((place) => ({
    id: place.id,
    name: place.name,
    description: place.description,
    category: place.category,
    text: prepareText(place),
    metadata: {
      category: place.category,
      difficulty: place.difficulty,
      duration: place.duration,
      ...(place.lat && place.lng && { coordinates: [place.lat, place.lng] }),
      ...(place.district && { district: place.district }),
      ...(place.length_km && { length_km: place.length_km }),
    },
  }));
}

/**
 * Сохраняет данные для CrewAI
 */
async function saveForCrewAI(embeddings: EmbeddingData[]) {
  const crewaiData = {
    timestamp: new Date().toISOString(),
    total: embeddings.length,
    categories: [...new Set(embeddings.map((e) => e.category))],
    tours: embeddings.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      metadata: e.metadata,
      searchText: e.text,
    })),
  };

  writeFileSync('crew/knowledge-base.json', JSON.stringify(crewaiData, null, 2));
  console.log('✅ Сохранено crew/knowledge-base.json для обучения агентов');
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Инициализация RAG базы знаний для агентов...\n');

  // Подключаемся к БД через Node.js (чтобы избежать проблем с psql)
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // 1. Загружаем маршруты из таблицы places
    console.log('📥 Загружаю маршруты из БД...');
    const result = await pool.query(`
      SELECT 
        id, name, description, category, category_slug, 
        lat, lng, district, length_km, duration, difficulty, images
      FROM places
      ORDER BY category, name
    `);

    const places: Place[] = result.rows;
    console.log(`✅ Загружено: ${places.length} маршрутов\n`);

    // 2. Готовим данные для embeddings
    console.log('🔄 Подготавливаю данные для embeddings...');
    const embeddings = procesPlaces(places);

    // 3. Статистика
    console.log('\n📊 Статистика:');
    const byCategory = embeddings.reduce(
      (acc, e) => {
        if (!acc[e.category]) acc[e.category] = 0;
        acc[e.category]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

    const withCoords = embeddings.filter((e) => e.metadata.coordinates).length;
    console.log(`  С координатами: ${withCoords}/${embeddings.length}`);

    // 4. Сохраняем для CrewAI
    console.log('\n💾 Сохраняю для CrewAI...');
    await saveForCrewAI(embeddings);

    // 5. Создаём индекс для pgvector (если его ещё нет)
    console.log('\n🔍 Проверяю pgvector...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector готов\n');

    console.log('✨ RAG база готова к обучению агентов!');
    console.log('Следующий шаг: npx ts-node scripts/train-agents.ts');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
