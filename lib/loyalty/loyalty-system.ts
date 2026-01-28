// =============================================
// СИСТЕМА ЛОЯЛЬНОСТИ KAMCHATOUR HUB
// Аналог Yandex Go бонусной системы
// =============================================

import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';

interface UserLevel {
  name: string;
  minSpent: number;
  discount: number;
  benefits: string[];
  color: string;
}

interface BonusTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'redeem' | 'expire' | 'refund';
  amount: number;
  description: string;
  bookingId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface LoyaltyStats {
  totalPoints: number;
  availablePoints: number;
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  pointsToNextLevel: number;
  totalEarned: number;
  totalRedeemed: number;
  transactions: BonusTransaction[];
}

export class LoyaltySystem {
  private levels: UserLevel[] = [
    {
      name: 'Новичок',
      minSpent: 0,
      discount: 0,
      benefits: ['Базовые уведомления'],
      color: '#6B7280'
    },
    {
      name: 'Бронза',
      minSpent: 5000,
      discount: 0.02,
      benefits: ['2% скидка', 'Приоритетная поддержка'],
      color: '#CD7F32'
    },
    {
      name: 'Серебро',
      minSpent: 15000,
      discount: 0.05,
      benefits: ['5% скидка', 'Быстрая подача', 'Эксклюзивные предложения'],
      color: '#C0C0C0'
    },
    {
      name: 'Золото',
      minSpent: 50000,
      discount: 0.10,
      benefits: ['10% скидка', 'VIP поддержка', 'Персональный менеджер'],
      color: '#FFD700'
    },
    {
      name: 'Платина',
      minSpent: 100000,
      discount: 0.15,
      benefits: ['15% скидка', 'Максимальный приоритет', 'Эксклюзивные услуги'],
      color: '#E5E4E2'
    }
  ];

  private earnRate = 0.01; // 1% от суммы заказа
  private redeemRate = 1; // 1 балл = 1 рубль
  private expirationDays = 365; // Баллы действуют 1 год

  // Получение статистики лояльности пользователя
  async getUserLoyaltyStats(userId: string): Promise<LoyaltyStats> {
    try {
      // Получаем общую сумму потраченных денег
      const spentResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM transfer_payments 
        WHERE customer_email = (
          SELECT email FROM users WHERE id = $1
        ) AND status = 'success'
      `, [userId]);

      const totalSpent = parseFloat(spentResult.rows[0].total_spent);

      // Получаем текущий уровень
      const currentLevel = this.getUserLevel(totalSpent);
      const nextLevel = this.getNextLevel(totalSpent);

      // Получаем баллы
      const pointsResult = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0) as total_earned,
          COALESCE(SUM(CASE WHEN type = 'redeem' THEN amount ELSE 0 END), 0) as total_redeemed,
          COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN type = 'redeem' THEN amount ELSE 0 END), 0) as available_points
        FROM loyalty_transactions 
        WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
      `, [userId]);

      const totalEarned = parseInt(pointsResult.rows[0].total_earned);
      const totalRedeemed = parseInt(pointsResult.rows[0].total_redeemed);
      const availablePoints = parseInt(pointsResult.rows[0].available_points);

      // Получаем последние транзакции
      const transactionsResult = await query(`
        SELECT * FROM loyalty_transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `, [userId]);

      const transactions = transactionsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        amount: parseInt(row.amount),
        description: row.description,
        bookingId: row.booking_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at
      }));

      return {
        totalPoints: totalEarned,
        availablePoints,
        currentLevel,
        nextLevel,
        pointsToNextLevel: nextLevel ? nextLevel.minSpent - totalSpent : 0,
        totalEarned,
        totalRedeemed,
        transactions
      };

    } catch (error) {
      console.error('Loyalty stats error:', error);
      throw new Error('Ошибка получения статистики лояльности');
    }
  }

  // Начисление баллов за заказ
  async earnPoints(userId: string, bookingId: string, amount: number): Promise<{
    success: boolean;
    pointsEarned: number;
    message: string;
  }> {
    try {
      const pointsEarned = Math.floor(amount * this.earnRate);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.expirationDays);

      const transactionId = `loyalty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await query(`
        INSERT INTO loyalty_transactions (
          id, user_id, type, amount, description, booking_id, expires_at
        ) VALUES ($1, $2, 'earn', $3, $4, $5, $6)
      `, [
        transactionId,
        userId,
        pointsEarned,
        `Начислено ${pointsEarned} баллов за заказ на сумму ${amount} руб.`,
        bookingId,
        expiresAt
      ]);

      return {
        success: true,
        pointsEarned,
        message: `Начислено ${pointsEarned} баллов!`
      };

    } catch (error) {
      console.error('Earn points error:', error);
      return {
        success: false,
        pointsEarned: 0,
        message: 'Ошибка начисления баллов'
      };
    }
  }

  // Списание баллов
  async redeemPoints(userId: string, pointsToRedeem: number, description: string): Promise<{
    success: boolean;
    pointsRedeemed: number;
    discountAmount: number;
    message: string;
  }> {
    try {
      // Проверяем доступные баллы
      const stats = await this.getUserLoyaltyStats(userId);
      
      if (stats.availablePoints < pointsToRedeem) {
        return {
          success: false,
          pointsRedeemed: 0,
          discountAmount: 0,
          message: 'Недостаточно баллов для списания'
        };
      }

      const discountAmount = pointsToRedeem * this.redeemRate;
      const transactionId = `loyalty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await query(`
        INSERT INTO loyalty_transactions (
          id, user_id, type, amount, description
        ) VALUES ($1, $2, 'redeem', $3, $4)
      `, [
        transactionId,
        userId,
        pointsToRedeem,
        description
      ]);

      return {
        success: true,
        pointsRedeemed: pointsToRedeem,
        discountAmount,
        message: `Списано ${pointsToRedeem} баллов на скидку ${discountAmount} руб.`
      };

    } catch (error) {
      console.error('Redeem points error:', error);
      return {
        success: false,
        pointsRedeemed: 0,
        discountAmount: 0,
        message: 'Ошибка списания баллов'
      };
    }
  }

  // Получение скидки по уровню
  getLevelDiscount(totalSpent: number): number {
    const level = this.getUserLevel(totalSpent);
    return level.discount;
  }

  // Получение текущего уровня пользователя
  getUserLevel(totalSpent: number): UserLevel {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (totalSpent >= this.levels[i].minSpent) {
        return this.levels[i];
      }
    }
    return this.levels[0];
  }

  // Получение следующего уровня
  getNextLevel(totalSpent: number): UserLevel | null {
    for (const level of this.levels) {
      if (totalSpent < level.minSpent) {
        return level;
      }
    }
    return null;
  }

  // Получение всех уровней
  getAllLevels(): UserLevel[] {
    return this.levels;
  }

  // Создание промокода
  async createPromoCode(code: string, discountType: 'percentage' | 'fixed', discountValue: number, 
                       maxUses: number, expiresAt: Date): Promise<{
    success: boolean;
    promoCodeId?: string;
    message: string;
  }> {
    try {
      const promoCodeId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await query(`
        INSERT INTO promo_codes (
          id, code, discount_type, discount_value, max_uses, current_uses, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, 0, $6, true)
      `, [promoCodeId, code, discountType, discountValue, maxUses, expiresAt]);

      return {
        success: true,
        promoCodeId,
        message: 'Промокод успешно создан'
      };

    } catch (error) {
      console.error('Create promo code error:', error);
      return {
        success: false,
        message: 'Ошибка создания промокода'
      };
    }
  }

  // Применение промокода
  async applyPromoCode(code: string, userId: string, orderAmount: number): Promise<{
    success: boolean;
    discountAmount: number;
    message: string;
  }> {
    try {
      const promoResult = await query(`
        SELECT * FROM promo_codes 
        WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
      `, [code]);

      if (promoResult.rows.length === 0) {
        return {
          success: false,
          discountAmount: 0,
          message: 'Промокод не найден или истек'
        };
      }

      const promo = promoResult.rows[0];

      if (promo.current_uses >= promo.max_uses) {
        return {
          success: false,
          discountAmount: 0,
          message: 'Промокод исчерпан'
        };
      }

      let discountAmount = 0;
      if (promo.discount_type === 'percentage') {
        discountAmount = orderAmount * (promo.discount_value / 100);
      } else {
        discountAmount = Math.min(promo.discount_value, orderAmount);
      }

      // Увеличиваем счетчик использований
      await query(`
        UPDATE promo_codes 
        SET current_uses = current_uses + 1 
        WHERE id = $1
      `, [promo.id]);

      return {
        success: true,
        discountAmount,
        message: `Промокод применен! Скидка: ${discountAmount} руб.`
      };

    } catch (error) {
      console.error('Apply promo code error:', error);
      return {
        success: false,
        discountAmount: 0,
        message: 'Ошибка применения промокода'
      };
    }
  }

  // Получение статистики лояльности для оператора
  async getOperatorLoyaltyStats(operatorId: string, period: string = '30 days'): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    averageOrderValue: number;
    retentionRate: number;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL '${period}' THEN u.id END) as active_users,
          COALESCE(SUM(CASE WHEN lt.type = 'earn' THEN lt.amount ELSE 0 END), 0) as total_points_earned,
          COALESCE(SUM(CASE WHEN lt.type = 'redeem' THEN lt.amount ELSE 0 END), 0) as total_points_redeemed,
          COALESCE(AVG(p.amount), 0) as average_order_value
        FROM users u
        LEFT JOIN transfer_payments p ON u.email = p.customer_email
        LEFT JOIN loyalty_transactions lt ON u.id = lt.user_id
        WHERE p.operator_id = $1 OR lt.user_id IN (
          SELECT id FROM users WHERE email IN (
            SELECT customer_email FROM transfer_payments WHERE operator_id = $1
          )
        )
      `, [operatorId]);

      const row = result.rows[0];
      return {
        totalUsers: parseInt(row.total_users),
        activeUsers: parseInt(row.active_users),
        totalPointsEarned: parseInt(row.total_points_earned),
        totalPointsRedeemed: parseInt(row.total_points_redeemed),
        averageOrderValue: parseFloat(row.average_order_value),
        retentionRate: row.total_users > 0 ? (row.active_users / row.total_users) : 0
      };

    } catch (error) {
      console.error('Operator loyalty stats error:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        averageOrderValue: 0,
        retentionRate: 0
      };
    }
  }
}

// Создаем глобальный экземпляр
export const loyaltySystem = new LoyaltySystem();

// Экспортируем типы
export type { UserLevel, BonusTransaction, LoyaltyStats };