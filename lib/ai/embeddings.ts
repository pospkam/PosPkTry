/**
 * Семантический поиск маршрутов — локальная модель MiniLM + in-memory cosine similarity.
 *
 * Модель: Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384 dims, русский)
 * Хранение: JSONB массив float в agent_route_knowledge.embedding
 * Поиск: in-memory cosine similarity (~259 записей, <1ms)
 */

import { query } from '@/lib/database';

// ── Типы ──────────────────────────────────────────────────────

export interface SemanticSearchResult {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sourceUrl: string | null;
  sourceName: string | null;
  lat: number | null;
  lng: number | null;
  similarity: number;
}

interface CachedRoute {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sourceUrl: string | null;
  sourceName: string | null;
  lat: number | null;
  lng: number | null;
  embedding: number[];
}

// ── Singleton: модель загружается один раз ─────────────────────

type PipelineInstance = {
  (text: string, options: Record<string, unknown>): Promise<{ data: Float32Array }>;
};

let pipelineInstance: PipelineInstance | null = null;
let pipelineLoading: Promise<PipelineInstance> | null = null;

async function getEmbeddingPipeline(): Promise<PipelineInstance> {
  if (pipelineInstance) return pipelineInstance;

  if (!pipelineLoading) {
    pipelineLoading = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const pipe = await pipeline(
        'feature-extraction',
        'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
        { device: 'cpu', dtype: 'fp32' }
      );
      pipelineInstance = pipe as unknown as PipelineInstance;
      return pipelineInstance;
    })();
  }

  return pipelineLoading;
}

/**
 * Pre-warm the model so first search request is fast.
 * Call from instrumentation.ts on server start (non-blocking).
 */
export async function warmModel(): Promise<void> {
  await getEmbeddingPipeline();
}

// ── Генерация эмбеддинга ──────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();
  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 512);

  const output = await pipe(cleanText, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// ── In-memory cache маршрутов ─────────────────────────────────

let embeddingCache: CachedRoute[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

async function loadEmbeddingCache(): Promise<CachedRoute[]> {
  const now = Date.now();
  if (embeddingCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return embeddingCache;
  }

  const result = await query<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    source_url: string | null;
    source_name: string | null;
    lat: string | null;
    lng: string | null;
    embedding: number[];
  }>(
    `SELECT id, title, description, category, source_url, source_name, lat, lng, embedding
     FROM agent_route_knowledge
     WHERE embedding IS NOT NULL`
  );

  embeddingCache = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    lat: row.lat != null ? parseFloat(String(row.lat)) : null,
    lng: row.lng != null ? parseFloat(String(row.lng)) : null,
    embedding: row.embedding,
  }));

  cacheTimestamp = now;
  return embeddingCache;
}

/**
 * Invalidate the in-memory cache (call after re-indexing).
 */
export function invalidateCache(): void {
  embeddingCache = null;
  cacheTimestamp = 0;
}

// ── Cosine similarity ─────────────────────────────────────────

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// ── Главная функция: семантический поиск ──────────────────────

const SIMILARITY_THRESHOLD = 0.3;

export async function semanticSearch(
  queryText: string,
  limit: number = 10
): Promise<SemanticSearchResult[]> {
  const queryEmbedding = await generateEmbedding(queryText);
  const cache = await loadEmbeddingCache();

  if (cache.length === 0) {
    return [];
  }

  // Cosine similarity = dot product (vectors are pre-normalized by MiniLM)
  const scored: (CachedRoute & { similarity: number })[] = [];

  for (const route of cache) {
    const sim = dotProduct(queryEmbedding, route.embedding);
    if (sim >= SIMILARITY_THRESHOLD) {
      scored.push({ ...route, similarity: sim });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, limit).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    sourceUrl: r.sourceUrl,
    sourceName: r.sourceName,
    lat: r.lat,
    lng: r.lng,
    similarity: Math.round(r.similarity * 100) / 100,
  }));
}
