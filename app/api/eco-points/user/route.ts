import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { UserEcoPoints, EcoAchievement, ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/eco-points/user - Получение Eco-points пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      } as ApiResponse<null>, { status: 400 });
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

    const userResult = await query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      // Создаем нового пользователя
      const createUserQuery = `
        INSERT INTO user_eco_points (user_id, total_points, level, last_activity)
        VALUES ($1, 0, 1, NOW())
        RETURNING *
      `;
      
      const newUserResult = await query(createUserQuery, [userId]);
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

    const achievementsResult = await query(achievementsQuery, [userId]);

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
    console.error('Error fetching user eco-points:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user eco-points',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/eco-points/user - Добавление очков пользователю
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, points, activity, ecoPointId } = body;

    if (!userId || !points || !activity) {
      return NextResponse.json({
        success: false,
        error: 'User ID, points, and activity are required',
      } as ApiResponse<null>, { status: 400 });
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

    const userResult = await query(userQuery, [userId]);
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

    const achievementsResult = await query(newAchievementsQuery, [userId]);
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
    console.error('Error adding eco-points:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add eco-points',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}