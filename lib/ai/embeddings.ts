/**
 * Генерация эмбеддингов и семантический поиск туров
 * Использует Groq embeddings API (совместимо с OpenAI)
 * Fallback: text-embedding-ada-002 compatible
 */

import { query } from '@/lib/database';

// ── Типы ──────────────────────────────────────────────────────
export interface TourEmbedding {
  tourId: string;
  embedding: number[];
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  description: string;
  price: number;
  difficulty?: string;
  duration?: number;
  category?: string;
  location?: string;
  tags?: string[];
  similarity: number;
}

// ── Генерация эмбеддинга через Groq/OpenAI-compatible API ─────
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Пробуем Groq (модель mixedembeddings) или OpenAI-совместимый endpoint
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY не задан — эмбеддинги недоступны');
    return null;
  }

  // Преобразуем текст: убираем лишние пробелы
  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 8000);

  try {
    // Groq поддерживает OpenAI-совместимый embeddings endpoint
    const res = await fetch('https://api.groq.com/openai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002', // или 'nomic-embed-text-v1.5' если доступен в Groq
        input: cleanText,
      }),
    });

    if (!res.ok) {
      // Groq может не поддерживать embeddings — используем имитацию для разработки
      console.warn(`Groq embeddings API: ${res.status}. Trying fallback.`);
      return await generateEmbeddingFallback(cleanText);
    }

    const data = await res.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.error('Embedding generation error:', err);
    return null;
  }
}

/**
 * Fallback: детерминированный псевдо-эмбеддинг на основе текста.
 * НЕ для production — только как заглушка при недоступном API.
 * Производит вектор размером 384 (MiniLM-compatible dimension).
 */
async function generateEmbeddingFallback(text: string): Promise<number[]> {
  const dim = 384;
  const vec = new Array<number>(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % dim] += text.charCodeAt(i) / 1000;
  }
  // L2 нормализация
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

// ── Индексирование одного тура ────────────────────────────────
export async function indexTour(tourId: string): Promise<boolean> {
  try {
    const result = await query<{
      title: string;
      description: string;
      category: string;
      location: string;
      tags: string[];
    }>(
      `SELECT title, description, category, location, tags FROM tours WHERE id = $1`,
      [tourId]
    );

    if (result.rows.length === 0) {
      console.warn(`Tour ${tourId} not found`);
      return false;
    }

    const tour = result.rows[0];
    const textToEmbed = [
      tour.title,
      tour.description,
      tour.category,
      tour.location,
      Array.isArray(tour.tags) ? tour.tags.join(' ') : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const embedding = await generateEmbedding(textToEmbed);
    if (!embedding) return false;

    // Сохраняем вектор в PostgreSQL (pgvector формат)
    const vectorStr = `[${embedding.join(',')}]`;
    await query(
      `UPDATE tours SET embedding = $1::vector WHERE id = $2`,
      [vectorStr, tourId]
    );

    return true;
  } catch (err) {
    console.error(`Index tour ${tourId} error:`, err);
    return false;
  }
}

// ── Семантический поиск ───────────────────────────────────────
export async function semanticSearch(
  queryText: string,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  const embedding = await generateEmbedding(queryText);
  if (!embedding) {
    return [];
  }

  try {
    const vectorStr = `[${embedding.join(',')}]`;

    const result = await query<SemanticSearchResult & { similarity: number }>(
      `SELECT
         id,
         title,
         description,
         price,
         difficulty,
         duration,
         category,
         location,
         tags,
         1 - (embedding <=> $1::vector) AS similarity
       FROM tours
       WHERE embedding IS NOT NULL
         AND is_active = true
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit]
    );

    return result.rows.map((row) => ({
      ...row,
      similarity: Math.round(row.similarity * 100) / 100,
    }));
  } catch (err) {
    console.error('Semantic search error:', err);
    return [];
  }
}
