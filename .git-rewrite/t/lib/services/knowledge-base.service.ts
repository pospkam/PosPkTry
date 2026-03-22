/**
 * Knowledge Base Service
 * Functions related to knowledge base articles search, CRUD.
 */

import { pool, toStringOrNull, toNumberOrNull } from './_helpers';

export const knowledgeBaseService = {
  async search(searchQuery: string) {
    try {
      const like = `%${searchQuery}%`;
      const res = await pool.query(
        `SELECT id, title, slug, category, tags, author, views, helpful, created_at
         FROM knowledge_base_articles
         WHERE title ILIKE $1 OR content ILIKE $1
         ORDER BY helpful DESC, views DESC
         LIMIT 20`,
        [like]
      );
      return { articles: res.rows, total: res.rows.length };
    } catch {
      return { articles: [], total: 0 };
    }
  },
  async list(params: Record<string, unknown>) {
    try {
      const page = toNumberOrNull(params.page) ?? 1;
      const limit = Math.min(toNumberOrNull(params.limit) ?? 20, 100);
      const offset = (page - 1) * limit;
      const category = toStringOrNull(params.category);

      const conditions: string[] = [];
      const queryParams: unknown[] = [];
      if (category) {
        conditions.push(`category = $${queryParams.length + 1}`);
        queryParams.push(category);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countRes, dataRes] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM knowledge_base_articles ${where}`, queryParams),
        pool.query(
          `SELECT id, title, slug, category, tags, author, views, helpful, created_at
           FROM knowledge_base_articles ${where}
           ORDER BY helpful DESC, created_at DESC
           LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
          [...queryParams, limit, offset]
        ),
      ]);
      return {
        articles: dataRes.rows,
        total: Number(countRes.rows[0]?.total ?? 0),
      };
    } catch {
      return { articles: [], total: 0 };
    }
  },
  async getById(id: string) {
    try {
      const res = await pool.query(
        `SELECT * FROM knowledge_base_articles WHERE id = $1`,
        [id]
      );
      return res.rows[0] ?? null;
    } catch {
      return null;
    }
  },
  async create(data: Record<string, unknown>) {
    try {
      const title = toStringOrNull(data.title) ?? '';
      const slug = toStringOrNull(data.slug) ?? title.toLowerCase().replace(/\s+/g, '-');
      const content = toStringOrNull(data.content) ?? '';
      const category = toStringOrNull(data.category) ?? 'general';
      const author = toStringOrNull(data.author) ?? 'system';
      const tags = Array.isArray(data.tags) ? data.tags : [];

      const res = await pool.query(
        `INSERT INTO knowledge_base_articles (title, slug, content, category, author, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, title, slug, category, author, tags, created_at`,
        [title, slug, content, category, author, tags]
      );
      return res.rows[0];
    } catch {
      return { id: 0, ...data };
    }
  },
  async update(id: string, data: Record<string, unknown>) {
    try {
      const fields = Object.entries(data)
        .filter(([k]) => ['title', 'content', 'category', 'tags'].includes(k))
        .map(([k], i) => `${k} = $${i + 2}`);
      if (fields.length === 0) return { id, ...data };
      const values = fields.map(f => data[f.split(' = ')[0].trim()]);
      const res = await pool.query(
        `UPDATE knowledge_base_articles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id, ...Object.values(data).filter((_, i) => fields[i] !== undefined)]
      );
      return res.rows[0] ?? { id, ...data };
    } catch {
      return { id, ...data };
    }
  },
  async searchArticles(filter: Record<string, unknown>) {
    const searchTerm = toStringOrNull(filter.search) ?? '';
    const result = searchTerm ? await this.search(searchTerm) : await this.list(filter);
    return {
      success: true,
      data: result.articles,
      total: result.total,
      page: toNumberOrNull(filter.page) ?? 1,
      limit: toNumberOrNull(filter.limit) ?? 20,
    };
  },
  async createArticle(data: Record<string, unknown>, author: string) {
    return this.create({ ...data, author });
  },
};
