import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/check-admin';
import { query } from '@/lib/database';
import { monitoringService } from '@/lib/monitoring';

// GET /api/admin/stats - Получение статистики для админ-панели
export async function GET(request: NextRequest) {
  try {
    // Проверка прав администратора
    const adminError = await requireAdmin(request);
    if (adminError) return adminError;

    // Реальные запросы к БД для получения статистики
    
    // Общая статистика
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users');
    const totalToursResult = await query('SELECT COUNT(*) as count FROM tours WHERE is_active = true');
    const totalBookingsResult = await query('SELECT COUNT(*) as count FROM bookings');
    const totalRevenueResult = await query('SELECT COALESCE(SUM(total_price), 0) as revenue FROM bookings WHERE payment_status = \'paid\'');
    const activeTransfersResult = await query('SELECT COUNT(*) as count FROM transfer_bookings WHERE status = \'active\'');
    const todayBookingsResult = await query('SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at) = CURRENT_DATE');
    
    // Рост за месяц
    const lastMonthBookingsResult = await query(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    `);
    const currentMonthBookingsResult = await query(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    const lastMonthCount = parseInt(lastMonthBookingsResult.rows[0]?.count || '0');
    const currentMonthCount = parseInt(currentMonthBookingsResult.rows[0]?.count || '0');
    const monthlyGrowth = lastMonthCount > 0 
      ? Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : 0;

    const stats = {
      totalUsers: parseInt(totalUsersResult.rows[0]?.count || '0'),
      totalTours: parseInt(totalToursResult.rows[0]?.count || '0'),
      totalBookings: parseInt(totalBookingsResult.rows[0]?.count || '0'),
      totalRevenue: parseFloat(totalRevenueResult.rows[0]?.revenue || '0'),
      activeTransfers: parseInt(activeTransfersResult.rows[0]?.count || '0'),
      todayBookings: parseInt(todayBookingsResult.rows[0]?.count || '0'),
      monthlyGrowth,
      
      // Распределение по ролям
      usersByRole: await getUsersByRole(),

      // Статистика за период (последние 7 дней)
      dailyBookings: await getDailyBookings(),
      dailyRevenue: await getDailyRevenue(),

      // Топ туры
      topTours: await getTopTours(),

      // Топ операторы
      topOperators: await getTopOperators(),

      // Системные метрики
      system: {
        uptime: Math.round(process.uptime() / 3600 * 100) / 100, // Часы работы
        avgResponseTime: await getAverageResponseTime(), // Получаем из мониторинга
        errorRate: await getErrorRate(), // Получаем из Sentry
        activeConnections: await getActiveConnections(), // Получаем из PM2 metrics
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении статистики' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Вспомогательные функции для получения статистики

async function getUsersByRole() {
  const result = await query(`
    SELECT role, COUNT(*) as count
    FROM users
    GROUP BY role
  `);
  
  const roleMap: Record<string, number> = {
    tourist: 0,
    operator: 0,
    guide: 0,
    transfer: 0,
    agent: 0,
    admin: 0,
  };
  
  result.rows.forEach(row => {
    roleMap[row.role] = parseInt(row.count);
  });
  
  return roleMap;
}

async function getDailyBookings() {
  const result = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  
  return result.rows.map(row => parseInt(row.count));
}

async function getDailyRevenue() {
  const result = await query(`
    SELECT DATE(created_at) as date, COALESCE(SUM(total_price), 0) as revenue
    FROM bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND payment_status = 'paid'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  
  return result.rows.map(row => parseFloat(row.revenue));
}

async function getTopTours() {
  const result = await query(`
    SELECT t.id, t.name, COUNT(b.id) as bookings
    FROM tours t
    LEFT JOIN bookings b ON t.id = b.tour_id
    GROUP BY t.id, t.name
    ORDER BY bookings DESC
    LIMIT 5
  `);
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    bookings: parseInt(row.bookings),
  }));
}

async function getTopOperators() {
  const result = await query(`
    SELECT 
      p.id, 
      p.name,
      COUNT(b.id) as bookings,
      COALESCE(SUM(b.total_price), 0) as revenue
    FROM partners p
    LEFT JOIN tours t ON p.id = t.operator_id
    LEFT JOIN bookings b ON t.id = b.tour_id AND b.payment_status = 'paid'
    WHERE p.type = 'operator'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  `);
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    revenue: parseFloat(row.revenue),
    bookings: parseInt(row.bookings),
  }));
}

// Получение среднего времени ответа от мониторинга
async function getAverageResponseTime(): Promise<number> {
  try {
    const metrics = monitoringService.getMetrics();
    if (metrics.length === 0) return 0;
    
    const responseTimes = metrics
      .filter(m => m.type === 'http_request')
      .map(m => m.duration || 0);
    
    if (responseTimes.length === 0) return 0;
    return Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );
  } catch {
    return 0;
  }
}

// Получение коэффициента ошибок
async function getErrorRate(): Promise<number> {
  try {
    const metrics = monitoringService.getMetrics();
    if (metrics.length === 0) return 0;
    
    const totalRequests = metrics.filter(m => m.type === 'http_request').length;
    const errorRequests = metrics.filter(
      m => m.type === 'http_request' && m.statusCode && m.statusCode >= 400
    ).length;
    
    if (totalRequests === 0) return 0;
    return Math.round((errorRequests / totalRequests) * 100) / 100;
  } catch {
    return 0;
  }
}

// Получение количества активных соединений
async function getActiveConnections(): Promise<number> {
  try {
    // Получаем количество активных сессий из БД
    const result = await query(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE expires_at > NOW()
    `);
    
    return parseInt(result.rows[0]?.count || '0');
  } catch {
    return 0;
  }
}



