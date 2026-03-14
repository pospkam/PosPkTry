
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { UserEcoPoints, EcoAchievement, ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';

const AddEcoPointsSchema = z.object({
  userId: z.string().optional(),
  points: z.number().int().positive('Баллы должны быть положительными'),
  activity: z.string().min(1, 'Тип активности обязателен'),
  ecoPointId: z.string().optional(),
});



/**
 * Получение eco-points пользователя (Kamchatour Hub)
 * @route GET /api/eco-points/user
 * @param {NextRequest} request - HTTP-запрос (ожидает JWT)
 * @returns {Promise<NextResponse>} JSON с балансом eco-points, уровнем, достижениями
 * @throws 401 если неавторизован, 404 если нет доступа к чужим eco-points, 500 при ошибке БД
 * @example
 * // GET /api/eco-points/user?userId=...
 * // Response: { success: true, data: { userId, totalPoints, level, achievements, lastActivity } }
 */

// GET /api/eco-points/user - Получение Eco-points пользователя
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse<null>, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const userId = requestedUserId || auth.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      } as ApiResponse<null>, { status: 400 });
    }

    if (requestedUserId && requestedUserId !== auth.userId && auth.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'User eco-points not found',
      } as ApiResponse<null>, { status: 404 });
    }

    // Получаем данные пользователя
    const userQuery = `
      SELECT 
        user_id,
        total_points,
        level,
        last_activity
      FROM user_eco_points
      WHERE user_id = $1
    `;

    const userResult = await query<{ user_id: string; total_points: number; level: number; last_activity: string }>(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      // Создаем нового пользователя
      const createUserQuery = `
        INSERT INTO user_eco_points (user_id, total_points, level, last_activity)
        VALUES ($1, 0, 1, NOW())
        RETURNING *
      `;
      
      const newUserResult = await query<{ user_id: string; total_points: number; level: number; last_activity: string }>(createUserQuery, [userId]);
      const userData = newUserResult.rows[0];

      return NextResponse.json({
        success: true,
        data: {
          userId: userData.user_id,
          totalPoints: userData.total_points,
          level: userData.level,
          achievements: [],
          lastActivity: new Date(userData.last_activity),
        } as UserEcoPoints,
      } as ApiResponse<UserEcoPoints>);
    }

    // Получаем достижения пользователя
    const achievementsQuery = `
      SELECT 
        a.id,
        a.name,
        a.description,
        a.points,
        ua.unlocked_at
      FROM eco_achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `;

    const achievementsResult = await query<{ id: string; name: string; description: string; points: number; unlocked_at: string }>(achievementsQuery, [userId]);

    const achievements: EcoAchievement[] = achievementsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      points: row.points,
      unlockedAt: new Date(row.unlocked_at),
    }));

    const userData = userResult.rows[0];
    const userEcoPoints: UserEcoPoints = {
      userId: userData.user_id,
      totalPoints: userData.total_points,
      level: userData.level,
      achievements,
      lastActivity: new Date(userData.last_activity),
    };

    return NextResponse.json({
      success: true,
      data: userEcoPoints,
    } as ApiResponse<UserEcoPoints>);

  } catch (error) {
    // Таблицы eco-points могут не существовать — возвращаем пустые данные
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('does not exist') || msg.includes('relation')) {
      const userId2 = new URL(request.url).searchParams.get('userId') || '';
      return NextResponse.json({
        success: true,
        data: { userId: userId2, totalPoints: 0, level: 1, achievements: [], lastActivity: new Date() },
      } as ApiResponse<UserEcoPoints>);
    }
    return NextResponse.json({
      success: false,
      error: 'Не удалось загрузить эко-баллы',
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * Добавление eco-points пользователю (Kamchatour Hub)
 * @route POST /api/eco-points/user
 * @param {NextRequest} request - HTTP-запрос (ожидает JWT)
 * @body {string} userId - ID пользователя (опционально, если не текущий)
 * @body {number} points - Количество начисляемых баллов
 * @body {string} activity - Тип активности (например, 'leave_review')
 * @body {string} ecoPointId - ID eco-действия (опционально)
 * @returns {Promise<NextResponse>} JSON с обновлённым балансом, уровнем, новыми достижениями
 * @throws 401 если неавторизован, 404 если нет доступа, 400 если не хватает данных, 500 при ошибке БД
 * @example
 * // POST /api/eco-points/user { userId, points, activity, ecoPointId }
 * // Response: { success: true, data: { userId, totalPoints, level, newAchievements, lastActivity } }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse<null>, { status: 401 });
    }

    const body = await request.json();
    const parsed = AddEcoPointsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные',
      } as ApiResponse<null>, { status: 400 });
    }

    const { userId: requestedUserId, points, activity, ecoPointId } = parsed.data;
    const userId = requestedUserId || auth.userId;

    if (userId !== auth.userId && auth.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'User eco-points not found',
      } as ApiResponse<null>, { status: 404 });
    }

    // Начинаем транзакцию
    const result = await query(`
      BEGIN;

      -- Обновляем очки пользователя
      INSERT INTO user_eco_points (user_id, total_points, level, last_activity)
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        total_points = user_eco_points.total_points + $2,
        level = CASE
          WHEN user_eco_points.total_points + $2 >= 1000 THEN 5
          WHEN user_eco_points.total_points + $2 >= 500 THEN 4
          WHEN user_eco_points.total_points + $2 >= 200 THEN 3
          WHEN user_eco_points.total_points + $2 >= 50 THEN 2
          ELSE 1
        END,
        last_activity = NOW();

      -- Записываем активность
      INSERT INTO user_eco_activities (user_id, points, activity, eco_point_id, created_at)
      VALUES ($1, $2, $3, $4, NOW());

      -- Проверяем новые достижения
      INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
      SELECT $1, a.id, NOW()
      FROM eco_achievements a
      WHERE a.points <= (
        SELECT total_points FROM user_eco_points WHERE user_id = $1
      )
      AND a.id NOT IN (
        SELECT achievement_id FROM user_achievements WHERE user_id = $1
      );

      COMMIT;
    `, [userId, points, activity, ecoPointId]);

    // Получаем обновленные данные пользователя
    const userQuery = `
      SELECT
        user_id,
        total_points,
        level,
        last_activity
      FROM user_eco_points
      WHERE user_id = $1
    `;

    const userResult = await query<{ user_id: string; total_points: number; level: number; last_activity: string }>(userQuery, [userId]);
    const userData = userResult.rows[0];

    // Получаем новые достижения
    const newAchievementsQuery = `
      SELECT
        a.id,
        a.name,
        a.description,
        a.points,
        ua.unlocked_at
      FROM eco_achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      AND ua.unlocked_at >= NOW() - INTERVAL '1 minute'
      ORDER BY ua.unlocked_at DESC
    `;

    const achievementsResult = await query<{ id: string; name: string; description: string; points: number; unlocked_at: string }>(newAchievementsQuery, [userId]);
    const newAchievements = achievementsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      points: row.points,
      unlockedAt: new Date(row.unlocked_at),
    }));

    return NextResponse.json({
      success: true,
      data: {
        userId: userData.user_id,
        totalPoints: userData.total_points,
        level: userData.level,
        newAchievements,
        lastActivity: new Date(userData.last_activity),
      },
      message: `Added ${points} points for ${activity}`,
    } as ApiResponse<{ userId: string; totalPoints: number; level: number; newAchievements: EcoAchievement[]; lastActivity: Date }>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Не удалось начислить эко-баллы',
    } as ApiResponse<null>, { status: 500 });
  }
}