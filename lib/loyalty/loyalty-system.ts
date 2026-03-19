import { query } from '@/lib/database';
import crypto from 'crypto';

interface UserLevel {
  name: string;
  minSpent: number;
  discount: number;
  earnMultiplier: number;
  benefits: string[];
  color: string;
}

interface BonusTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'redeem' | 'expire' | 'refund';
  source: string;
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
  totalSpent: number;
  transactions: BonusTransaction[];
  referral: {
    code: string | null;
    invited: number;
    completed: number;
    totalEarned: number;
  };
}

const ACTIVITY_POINTS: Record<string, { points: number; description: string }> = {
  review: { points: 50, description: 'Отзыв' },
  photo: { points: 20, description: 'Фото к отзыву' },
  first_booking: { points: 100, description: 'Первое бронирование' },
  referral_referrer: { points: 500, description: 'Реферал: друг забронировал тур' },
  referral_referred: { points: 200, description: 'Бонус за регистрацию по приглашению' },
};

export class LoyaltySystem {
  private levels: UserLevel[] = [
    { name: 'Новичок', minSpent: 0, discount: 0, earnMultiplier: 1.0, benefits: ['Базовые уведомления'], color: '#6B7280' },
    { name: 'Бронза', minSpent: 5000, discount: 0.02, earnMultiplier: 1.2, benefits: ['2% скидка', 'Приоритетная поддержка'], color: '#CD7F32' },
    { name: 'Серебро', minSpent: 15000, discount: 0.05, earnMultiplier: 1.5, benefits: ['5% скидка', 'Ранний доступ к турам'], color: '#C0C0C0' },
    { name: 'Золото', minSpent: 50000, discount: 0.10, earnMultiplier: 2.0, benefits: ['10% скидка', 'VIP поддержка', 'Персональный менеджер'], color: '#FFD700' },
    { name: 'Платина', minSpent: 100000, discount: 0.15, earnMultiplier: 3.0, benefits: ['15% скидка', 'Максимальный приоритет', 'Эксклюзивные туры'], color: '#E5E4E2' },
  ];

  private earnRate = 0.01;
  private expirationDays = 365;

  async getUserLoyaltyStats(userId: string): Promise<LoyaltyStats> {
    // Total spent from users table (incrementally updated)
    const spentResult = await query<{ total_spent: string }>(
      'SELECT COALESCE(total_spent, 0) as total_spent FROM users WHERE id = $1',
      [userId]
    );
    const totalSpent = parseFloat(spentResult.rows[0]?.total_spent ?? '0');

    const currentLevel = this.getUserLevel(totalSpent);
    const nextLevel = this.getNextLevel(totalSpent);

    // Points aggregation
    const pointsResult = await query<{ total_earned: string; total_redeemed: string; available_points: string }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN amount ELSE 0 END), 0) as total_redeemed,
        COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN amount ELSE 0 END), 0) as available_points
      FROM loyalty_transactions
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW()) AND type != 'expire'`,
      [userId]
    );

    const totalEarned = parseInt(pointsResult.rows[0]?.total_earned ?? '0');
    const totalRedeemed = parseInt(pointsResult.rows[0]?.total_redeemed ?? '0');
    const availablePoints = parseInt(pointsResult.rows[0]?.available_points ?? '0');

    // Recent transactions
    const txResult = await query<{
      id: string; user_id: string; type: string; source: string;
      amount: string; description: string; booking_id: string | null;
      created_at: Date; expires_at: Date | null;
    }>(
      `SELECT * FROM loyalty_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    const transactions: BonusTransaction[] = txResult.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type as BonusTransaction['type'],
      source: r.source,
      amount: parseInt(r.amount),
      description: r.description,
      bookingId: r.booking_id ?? undefined,
      createdAt: r.created_at,
      expiresAt: r.expires_at ?? undefined,
    }));

    // Referral stats
    const refResult = await query<{ referral_code: string | null }>(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );
    const refCode = refResult.rows[0]?.referral_code ?? null;

    let refStats = { invited: 0, completed: 0, totalEarned: 0 };
    if (refCode) {
      const refCountResult = await query<{ invited: string; completed: string; total_earned: string }>(
        `SELECT
          COUNT(*) as invited,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN reward_amount ELSE 0 END), 0) as total_earned
        FROM referrals WHERE referrer_id = $1`,
        [userId]
      );
      if (refCountResult.rows[0]) {
        refStats = {
          invited: parseInt(refCountResult.rows[0].invited),
          completed: parseInt(refCountResult.rows[0].completed),
          totalEarned: parseInt(refCountResult.rows[0].total_earned),
        };
      }
    }

    return {
      totalPoints: totalEarned,
      availablePoints: Math.max(0, availablePoints),
      currentLevel,
      nextLevel,
      pointsToNextLevel: nextLevel ? nextLevel.minSpent - totalSpent : 0,
      totalEarned,
      totalRedeemed,
      totalSpent,
      transactions,
      referral: { code: refCode, ...refStats },
    };
  }

  async earnPoints(
    userId: string,
    bookingId: string,
    amount: number,
    source: string = 'booking'
  ): Promise<{ success: boolean; pointsEarned: number; message: string }> {
    try {
      const pointsEarned = Math.floor(amount * this.earnRate);
      if (pointsEarned <= 0) return { success: true, pointsEarned: 0, message: 'Сумма слишком мала для начисления' };

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.expirationDays);
      const txId = `lt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      await query(
        `INSERT INTO loyalty_transactions (id, user_id, type, amount, source, description, booking_id, expires_at)
         VALUES ($1, $2, 'earn', $3, $4, $5, $6, $7)`,
        [txId, userId, pointsEarned, source,
         `Начислено ${pointsEarned} баллов за заказ на сумму ${amount} руб.`,
         bookingId, expiresAt]
      );

      return { success: true, pointsEarned, message: `Начислено ${pointsEarned} баллов` };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, pointsEarned: 0, message: `Ошибка начисления: ${msg}` };
    }
  }

  async earnActivityPoints(
    userId: string,
    source: string,
    entityId?: string
  ): Promise<{ success: boolean; pointsEarned: number; message: string }> {
    const config = ACTIVITY_POINTS[source];
    if (!config) return { success: false, pointsEarned: 0, message: 'Неизвестный тип активности' };

    // Dedup check
    if (entityId) {
      const existing = await query<{ id: string }>(
        `SELECT id FROM loyalty_transactions WHERE user_id = $1 AND source = $2 AND booking_id = $3 LIMIT 1`,
        [userId, source, entityId]
      );
      if (existing.rows.length > 0) {
        return { success: false, pointsEarned: 0, message: 'Баллы за эту активность уже начислены' };
      }
    }

    // For first_booking: check if user has ANY earn transaction with source=booking
    if (source === 'first_booking') {
      const hasPrev = await query<{ id: string }>(
        `SELECT id FROM loyalty_transactions WHERE user_id = $1 AND source = 'first_booking' LIMIT 1`,
        [userId]
      );
      if (hasPrev.rows.length > 0) {
        return { success: false, pointsEarned: 0, message: 'Бонус за первое бронирование уже получен' };
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.expirationDays);
    const txId = `lt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    await query(
      `INSERT INTO loyalty_transactions (id, user_id, type, amount, source, description, booking_id, expires_at)
       VALUES ($1, $2, 'earn', $3, $4, $5, $6, $7)`,
      [txId, userId, config.points, source, config.description, entityId ?? null, expiresAt]
    );

    return { success: true, pointsEarned: config.points, message: `+${config.points} баллов: ${config.description}` };
  }

  async redeemPoints(
    userId: string,
    pointsToRedeem: number,
    description: string
  ): Promise<{ success: boolean; pointsRedeemed: number; discountAmount: number; message: string }> {
    try {
      const stats = await this.getUserLoyaltyStats(userId);

      if (stats.availablePoints < pointsToRedeem) {
        return { success: false, pointsRedeemed: 0, discountAmount: 0, message: 'Недостаточно баллов' };
      }

      const discountAmount = pointsToRedeem;
      const txId = `lt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      await query(
        `INSERT INTO loyalty_transactions (id, user_id, type, amount, source, description)
         VALUES ($1, $2, 'redeem', $3, 'redeem', $4)`,
        [txId, userId, pointsToRedeem, description]
      );

      return { success: true, pointsRedeemed: pointsToRedeem, discountAmount, message: `Списано ${pointsToRedeem} баллов` };
    } catch {
      return { success: false, pointsRedeemed: 0, discountAmount: 0, message: 'Ошибка списания баллов' };
    }
  }

  async generateReferralCode(userId: string): Promise<string> {
    // Check if already has one
    const existing = await query<{ referral_code: string | null }>(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );
    if (existing.rows[0]?.referral_code) return existing.rows[0].referral_code;

    // Generate unique code KH-XXXXXX
    let code: string;
    let attempts = 0;
    do {
      const rand = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
      code = `KH-${rand}`;
      const dup = await query('SELECT 1 FROM users WHERE referral_code = $1', [code]);
      if (dup.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    await query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, userId]);
    return code;
  }

  async completeReferral(referredUserId: string): Promise<void> {
    // Find referrer
    const userResult = await query<{ referred_by: string | null }>(
      'SELECT referred_by FROM users WHERE id = $1',
      [referredUserId]
    );
    const referrerId = userResult.rows[0]?.referred_by;
    if (!referrerId) return;

    // Check if already completed
    const existing = await query<{ status: string }>(
      `SELECT status FROM referrals WHERE referrer_id = $1 AND referred_id = $2`,
      [referrerId, referredUserId]
    );
    if (existing.rows[0]?.status === 'completed') return;

    // Complete referral
    await query(
      `UPDATE referrals SET status = 'completed', reward_amount = 500, completed_at = NOW()
       WHERE referrer_id = $1 AND referred_id = $2`,
      [referrerId, referredUserId]
    );

    // Award points to referrer
    await this.earnActivityPoints(referrerId, 'referral_referrer', referredUserId);
    // Award points to referred
    await this.earnActivityPoints(referredUserId, 'referral_referred', referrerId);
  }

  getUserLevel(totalSpent: number): UserLevel {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (totalSpent >= this.levels[i].minSpent) return this.levels[i];
    }
    return this.levels[0];
  }

  getNextLevel(totalSpent: number): UserLevel | null {
    for (const level of this.levels) {
      if (totalSpent < level.minSpent) return level;
    }
    return null;
  }

  getLevelDiscount(totalSpent: number): number {
    return this.getUserLevel(totalSpent).discount;
  }

  getAllLevels(): UserLevel[] {
    return this.levels;
  }

  async applyPromoCode(
    code: string,
    _userId: string,
    orderAmount: number
  ): Promise<{ success: boolean; discountAmount: number; message: string }> {
    try {
      const promoResult = await query<{
        id: string; discount_type: string; discount_value: string;
        max_uses: number; current_uses: number;
      }>(
        `SELECT * FROM promo_codes WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())`,
        [code]
      );

      if (promoResult.rows.length === 0) {
        return { success: false, discountAmount: 0, message: 'Промокод не найден или истёк' };
      }

      const promo = promoResult.rows[0];
      if (promo.current_uses >= promo.max_uses) {
        return { success: false, discountAmount: 0, message: 'Промокод исчерпан' };
      }

      const discountAmount = promo.discount_type === 'percentage'
        ? orderAmount * (parseFloat(promo.discount_value) / 100)
        : Math.min(parseFloat(promo.discount_value), orderAmount);

      await query('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1', [promo.id]);

      return { success: true, discountAmount, message: `Скидка: ${Math.round(discountAmount)} руб.` };
    } catch {
      return { success: false, discountAmount: 0, message: 'Ошибка применения промокода' };
    }
  }
}

export const loyaltySystem = new LoyaltySystem();
export type { UserLevel, BonusTransaction, LoyaltyStats };
