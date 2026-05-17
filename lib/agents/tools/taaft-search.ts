import { pool } from '@/lib/db-pool';

export interface ExternalTool {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  is_free: boolean;
  api_available: boolean;
  rating: number | null;
  use_count: number;
}

export async function searchExternalTools(task: string, limit = 5): Promise<ExternalTool[]> {
  if (!task.trim()) return [];

  const { rows } = await pool.query<ExternalTool>(
    `SELECT id, slug, name, description, url, category, tags,
            is_free, api_available, rating, use_count
     FROM external_tools
     WHERE verified = TRUE
       AND (search_vector @@ plainto_tsquery('simple', $1)
        OR name ILIKE $2
        OR description ILIKE $2)
     ORDER BY
       CASE WHEN name ILIKE $2 THEN 1 ELSE 2 END,
       use_count DESC
     LIMIT $3`,
    [task.toLowerCase(), `%${task}%`, limit],
  );
  return rows;
}

export async function trackToolUsage(slug: string): Promise<void> {
  await pool.query(
    `UPDATE external_tools
     SET use_count = use_count + 1, last_used_at = NOW()
     WHERE slug = $1`,
    [slug],
  );
}

export function formatToolsForKuzmich(tools: ExternalTool[]): string {
  if (tools.length === 0) {
    return 'Специализированных AI-инструментов для этой задачи в каталоге нет. Попробуй сформулировать иначе.';
  }
  const lines = tools.map((t) => {
    const meta = [t.category, t.is_free ? 'бесплатный' : 'платный', t.api_available ? 'есть API' : null]
      .filter(Boolean)
      .join(', ');
    return `• ${t.name} (${meta})\n  ${t.description}\n  ${t.url}`;
  });
  return `Нашёл ${tools.length} подходящих инструментов:\n\n${lines.join('\n\n')}`;
}
