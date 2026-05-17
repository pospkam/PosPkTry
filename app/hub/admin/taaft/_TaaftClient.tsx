'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Search, RefreshCw, ExternalLink, CheckCircle, XCircle, Cpu, Star } from 'lucide-react';

interface ExternalTool {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  is_free: boolean;
  api_available: boolean;
  rating: string | null;
  use_count: number;
  source: string;
  last_used_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  byCategory: { category: string; count: number }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  safety: 'Безопасность',
  geo: 'Геоданные',
  image: 'Изображения',
  text: 'Тексты',
  audio: 'Аудио',
  data: 'Аналитика',
  travel: 'Туризм',
  other: 'Прочее',
};

export default function TaaftClient() {
  const [tools, setTools] = useState<ExternalTool[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const load = useCallback(async (query = q, cat = category) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (cat) params.set('category', cat);
    try {
      const res = await fetch(`/api/admin/taaft?${params}`);
      const data = await res.json() as { tools: ExternalTool[]; stats: Stats };
      setTools(data.tools);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [q, category]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, category);
  };

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">AI-инструменты</h1>
          {stats && (
            <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">
              {stats.total} инструментов
            </span>
          )}
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md hover:text-[var(--text-primary)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Stats by category */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategory(''); void load(q, ''); }}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              !category ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Все ({stats.byCategory.reduce((s, c) => s + c.count, 0)})
          </button>
          {stats.byCategory.map((c) => (
            <button
              key={c.category}
              onClick={() => { setCategory(c.category); void load(q, c.category); }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                category === c.category
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {CATEGORY_LABELS[c.category] ?? c.category} ({c.count})
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Найти инструмент..."
            className="ds-input pl-8 w-full text-xs"
          />
        </div>
        <button type="submit" className="ds-btn ds-btn-primary text-xs px-4">
          Поиск
        </button>
      </form>

      {/* Tools table */}
      <div className="ds-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
          </div>
        ) : tools.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Инструменты не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Инструмент', 'Категория', 'Цена', 'API', 'Рейтинг', 'Использований', ''].map((h) => (
                    <th key={h} className="text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide px-4 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-[var(--bg-hover)] flex items-center justify-center shrink-0 mt-0.5">
                          <Cpu className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] leading-tight">{tool.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2 max-w-xs">{tool.description}</p>
                          {tool.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tool.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {CATEGORY_LABELS[tool.category] ?? tool.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tool.is_free
                        ? <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                        : <XCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                    </td>
                    <td className="px-4 py-3">
                      {tool.api_available
                        ? <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                        : <XCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                    </td>
                    <td className="px-4 py-3">
                      {tool.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-[var(--warning)]" />
                          <span className="text-xs text-[var(--text-secondary)]">{tool.rating}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${tool.use_count > 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                        {tool.use_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[var(--ocean)] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Открыть
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        Kuzmich использует этот каталог через инструмент <code className="text-[var(--accent)]">search_taaft</code>.
        Количество использований обновляется автоматически.
      </p>
    </div>
  );
}
