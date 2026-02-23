/**
 * Wishlist Service
 * Управление списками желаний пользователей
 */

import { Pool } from 'pg';
import { pool } from '@/lib/db';

export class WishlistService {
  private db: Pool;

  constructor(db?: Pool) {
    this.db = db || pool;
  }

  async listWishlists(userId: string, filters: Record<string, unknown> = {}, limit = 50, offset = 0) {
    try {
      const result = await this.db.query(
        `SELECT * FROM wishlists WHERE user_id = $1 LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      const countResult = await this.db.query(
        `SELECT COUNT(*) FROM wishlists WHERE user_id = $1`,
        [userId]
      );
      return { wishlists: result.rows, total: parseInt(countResult.rows[0].count) };
    } catch {
      return { wishlists: [], total: 0 };
    }
  }

  async createWishlist(data: Record<string, unknown>, userId: string) {
    const result = await this.db.query(
      `INSERT INTO wishlists (user_id, name, description, is_public, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [userId, data.name, data.description, data.isPublic ?? false]
    );
    return result.rows[0];
  }

  async getWishlist(id: string, userId: string) {
    const result = await this.db.query(
      `SELECT * FROM wishlists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async updateWishlist(id: string, data: Record<string, unknown>, userId: string) {
    const result = await this.db.query(
      `UPDATE wishlists SET name = COALESCE($3, name), description = COALESCE($4, description),
       updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, data.name, data.description]
    );
    return result.rows[0] || null;
  }

  async deleteWishlist(id: string, userId: string) {
    await this.db.query(
      `DELETE FROM wishlists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return { success: true };
  }

  async addItem(wishlistId: string, itemData: Record<string, unknown>, userId: string) {
    const result = await this.db.query(
      `INSERT INTO wishlist_items (wishlist_id, item_type, item_id, added_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [wishlistId, itemData.type, itemData.id]
    );
    return result.rows[0];
  }

  async removeItem(wishlistId: string, itemId: string, userId: string) {
    await this.db.query(
      `DELETE FROM wishlist_items WHERE wishlist_id = $1 AND id = $2`,
      [wishlistId, itemId]
    );
    return { success: true };
  }
}

export const wishlistService = new WishlistService();
