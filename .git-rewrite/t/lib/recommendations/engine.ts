/**
 * Движок рекомендаций туров
 * 3 стратегии: Similar Users, Tour Content, Eco-Optimized
 * Чистый SQL, без внешних ML-библиотек
 */

import { query } from '@/lib/database';

// ── Типы ──────────────────────────────────────────────────────
export type RecommendationStrategy =
  | 'SIMILAR_USERS'
  | 'TOUR_CONTENT'
  | 'ECO_OPTIMIZED';

export interface RecommendedTour {
  id: string;
  title: string;
  description: string;
  price: number;
  difficulty?: string;
  duration?: number;
  category?: string;
  location?: string;
  rating?: number;
  images?: string[];
  eco_points_reward?: number;
  strategy: RecommendationStrategy;
  strategyLabel: string;
}

const STRATEGY_LABELS: Record<RecommendationStrategy, string> = {
  SIMILAR_USERS: 'Популярно среди похожих путешественников',
  TOUR_CONTENT: 'На основе вашей истории',
  ECO_OPTIMIZED: 'Максимум эко-баллов',
};

// ── Стратегия 1: Похожие пользователи ────────────────────────
/**
 * "Пользователи, купившие те же туры, также покупали..."
 * Находит юзеров с 2+ общими бронированиями → берёт их другие туры
 */
async function getSimilarUsersRecommendations(
  userId: string,
  bookedTourIds: string[],
  limit: number
): Promise<RecommendedTour[]> {
  if (bookedTourIds.length === 0) return [];

  try {
    const result = await query<RecommendedTour>(
      `SELECT DISTINCT
         t.id, t.title, t.description, t.price, t.difficulty,
         t.duration, t.category, t.location, t.rating,
         t.images, t.eco_points_reward
       FROM bookings b1
       -- Находим похожих пользователей (2+ общих тура)
       JOIN bookings b2 ON b2.tour_id = b1.tour_id
                       AND b2.user_id != $1
                       AND b2.status IN ('confirmed', 'completed')
       -- Их другие бронирования
       JOIN bookings b3 ON b3.user_id = b2.user_id
                       AND b3.status IN ('confirmed', 'completed')
       -- Детали тура
       JOIN tours t ON t.id = b3.tour_id
                   AND t.id != ALL($2::text[])
                   AND t.is_active = true
       WHERE b1.user_id = $1
         AND b1.status IN ('confirmed', 'completed')
       GROUP BY t.id, t.title, t.description, t.price, t.difficulty,
                t.duration, t.category, t.location, t.rating,
                t.images, t.eco_points_reward
       HAVING COUNT(DISTINCT b2.user_id) >= 1
       ORDER BY COUNT(DISTINCT b2.user_id) DESC, t.rating DESC NULLS LAST
       LIMIT $3`,
      [userId, bookedTourIds, limit]
    );

    return result.rows.map((r) => ({
      ...r,
      strategy: 'SIMILAR_USERS' as const,
      strategyLabel: STRATEGY_LABELS.SIMILAR_USERS,
    }));
  } catch (err) {
    console.error('SIMILAR_USERS strategy error:', err);
    return [];
  }
}

// ── Стратегия 2: Content-based (по содержимому туров) ─────────
/**
 * "Потому что вам понравился [тур], вы можете оценить..."
 * Похожая категория, цена ±30%, схожая сложность
 */
async function getContentBasedRecommendations(
  bookedTourIds: string[],
  limit: number
): Promise<RecommendedTour[]> {
  if (bookedTourIds.length === 0) return [];

  try {
    // Получаем профиль предпочтений из забронированных туров
    const profile = await query<{
      avg_price: number;
      top_category: string;
      top_difficulty: string;
    }>(
      `SELECT
         AVG(price)                                         AS avg_price,
         MODE() WITHIN GROUP (ORDER BY category)           AS top_category,
         MODE() WITHIN GROUP (ORDER BY difficulty)         AS top_difficulty
       FROM tours
       WHERE id = ANY($1::text[])`,
      [bookedTourIds]
    );

    if (profile.rows.length === 0) return [];

    const { avg_price, top_category, top_difficulty } = profile.rows[0];
    const minPrice = Math.round(avg_price * 0.7);
    const maxPrice = Math.round(avg_price * 1.3);

    const result = await query<RecommendedTour>(
      `SELECT
         id, title, description, price, difficulty,
         duration, category, location, rating,
         images, eco_points_reward
       FROM tours
       WHERE id != ALL($1::text[])
         AND is_active = true
         AND (
           category = $2
           OR difficulty = $3
           OR (price BETWEEN $4 AND $5)
         )
       ORDER BY
         (CASE WHEN category = $2 THEN 3 ELSE 0 END +
          CASE WHEN difficulty = $3 THEN 2 ELSE 0 END +
          CASE WHEN price BETWEEN $4 AND $5 THEN 1 ELSE 0 END) DESC,
         rating DESC NULLS LAST
       LIMIT $6`,
      [bookedTourIds, top_category, top_difficulty, minPrice, maxPrice, limit]
    );

    return result.rows.map((r) => ({
      ...r,
      strategy: 'TOUR_CONTENT' as const,
      strategyLabel: STRATEGY_LABELS.TOUR_CONTENT,
    }));
  } catch (err) {
    console.error('TOUR_CONTENT strategy error:', err);
    return [];
  }
}

// ── Стратегия 3: Eco-Optimized ────────────────────────────────
/**
 * "Максимизируй эко-баллы с этими турами"
 * Туры с наибольшим eco_points_reward в предпочитаемых категориях
 */
async function getEcoOptimizedRecommendations(
  bookedTourIds: string[],
  limit: number
): Promise<RecommendedTour[]> {
  try {
    // Топ категории пользователя (если есть история)
    let categoryFilter = '';
    const params: (string | number | string[])[] = [bookedTourIds, limit];

    if (bookedTourIds.length > 0) {
      const cats = await query<{ category: string }>(
        `SELECT DISTINCT category FROM tours WHERE id = ANY($1::text[]) AND category IS NOT NULL LIMIT 3`,
        [bookedTourIds]
      );
      if (cats.rows.length > 0) {
        const categories = cats.rows.map((r) => r.category);
        categoryFilter = `AND category = ANY($3::text[])`;
        params.push(categories);
      }
    }

    const result = await query<RecommendedTour>(
      `SELECT
         id, title, description, price, difficulty,
         duration, category, location, rating,
         images, eco_points_reward
       FROM tours
       WHERE id != ALL($1::text[])
         AND is_active = true
         AND eco_points_reward IS NOT NULL
         AND eco_points_reward > 0
         ${categoryFilter}
       ORDER BY eco_points_reward DESC, rating DESC NULLS LAST
       LIMIT $2`,
      params
    );

    return result.rows.map((r) => ({
      ...r,
      strategy: 'ECO_OPTIMIZED' as const,
      strategyLabel: STRATEGY_LABELS.ECO_OPTIMIZED,
    }));
  } catch (err) {
    console.error('ECO_OPTIMIZED strategy error:', err);
    return [];
  }
}

// ── Основная функция ──────────────────────────────────────────
export async function getRecommendations(
  userId: string,
  limit: number = 6
): Promise<RecommendedTour[]> {
  // Получаем последние 5 бронирований пользователя
  const bookingsResult = await query<{ tour_id: string }>(
    `SELECT tour_id FROM bookings
     WHERE user_id = $1
       AND status IN ('confirmed', 'completed')
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  const bookedTourIds = bookingsResult.rows.map((r) => r.tour_id);

  // Запускаем все 3 стратегии параллельно
  const perStrategy = Math.ceil(limit / 3);
  const [similar, content, eco] = await Promise.all([
    getSimilarUsersRecommendations(userId, bookedTourIds, perStrategy),
    getContentBasedRecommendations(bookedTourIds, perStrategy),
    getEcoOptimizedRecommendations(bookedTourIds, perStrategy),
  ]);

  // Дедупликация по id
  const seen = new Set<string>();
  const merged: RecommendedTour[] = [];

  for (const tour of [...similar, ...content, ...eco]) {
    if (!seen.has(tour.id) && merged.length < limit) {
      seen.add(tour.id);
      merged.push(tour);
    }
  }

  // Если история пустая — возвращаем топ по рейтингу
  if (merged.length === 0) {
    const fallback = await query<RecommendedTour>(
      `SELECT id, title, description, price, difficulty, duration,
              category, location, rating, images, eco_points_reward
       FROM tours WHERE is_active = true
       ORDER BY rating DESC NULLS LAST, created_at DESC
       LIMIT $1`,
      [limit]
    );
    return fallback.rows.map((r) => ({
      ...r,
      strategy: 'TOUR_CONTENT' as const,
      strategyLabel: 'Рекомендуем попробовать',
    }));
  }

  return merged;
}

// ── Кэширование в PostgreSQL ─────────────────────────────────
export async function getCachedRecommendations(
  userId: string
): Promise<RecommendedTour[] | null> {
  try {
    const result = await query<{
      recommendations: RecommendedTour[];
      recommended_at: Date;
    }>(
      `SELECT recommendations, recommended_at FROM users
       WHERE id = $1
         AND recommended_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    if (result.rows.length > 0 && result.rows[0].recommendations) {
      return result.rows[0].recommendations;
    }
  } catch {
    // Колонка может не существовать
  }
  return null;
}

export async function saveRecommendationsCache(
  userId: string,
  recommendations: RecommendedTour[]
): Promise<void> {
  try {
    await query(
      `UPDATE users
       SET recommendations = $1::jsonb, recommended_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(recommendations), userId]
    );
  } catch {
    // Не критично
  }
}
