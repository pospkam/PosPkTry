import { Pool, QueryResult } from 'pg'

/**
 * DatabaseService - Управление подключением к БД PostgreSQL
 */
export class DatabaseService {
  private static instance: DatabaseService
  private pool: Pool

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async query<T = any>(
    text: string,
    values?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now()
    try {
      const result = await this.pool.query<T>(text, values)
      const duration = Date.now() - start
      console.log('Executed query', { text, duration, rows: result.rowCount })
      return result
    } catch (error) {
      console.error('Database query error', { text, error })
      throw error
    }
  }

  async getClient() {
    return this.pool.connect()
  }

  async close() {
    await this.pool.end()
  }
}

export const databaseService = DatabaseService.getInstance()
