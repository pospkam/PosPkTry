'use client';

import { useEffect, useState, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import { Building2, Search, Loader2, CheckCircle2, Ban, Star, AlertCircle } from 'lucide-react';

interface Operator {
  id: string; name: string; status: 'active' | 'pending';
  rating: number; reviewCount: number;
}

function getToken() {
  try {
    const user = JSON.parse(localStorage.getItem('user') ?? '{}');
    return (user.token as string) ?? '';
  } catch {
    return '';
  }
}

export default function OperatorsClient() {
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [search, setSearch]       = useState('');
  const [acting, setActing]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/content/partners?category=operator&limit=100', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      const rows = json.data?.data ?? [];
      setOperators(rows.map((p: {
        id: string; name: string; isVerified: boolean; rating: number; reviewCount: number;
      }) => ({
        id: p.id,
        name: p.name,
        status: p.isVerified ? 'active' : 'pending',
        rating: p.rating,
        reviewCount: p.reviewCount,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function activate(id: string) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/content/partners/${id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setOperators(prev => prev.map(o => o.id === id ? { ...o, status: 'active' as const } : o));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActing(null);
    }
  }

  const filtered = operators.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_CLS: Record<string, string> = {
    active:  'bg-[var(--success)]/15 text-[var(--success)]',
    pending: 'bg-[var(--warning)]/15 text-[var(--warning)]',
  };
  const STATUS_LBL: Record<string, string> = {
    active: 'Активен', pending: 'На проверке',
  };

  return (
    <Protected roles={['admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Операторы</h1>
            {!loading && <span className="text-sm text-[var(--text-muted)]">{operators.length}</span>}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="min-h-[44px] pl-10 pr-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-[var(--danger)]" />
            <p className="text-[var(--text-secondary)] text-sm">{error}</p>
            <button onClick={load} className="text-sm text-[var(--accent)] underline">Повторить</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Операторы не найдены</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(op => (
              <div key={op.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{op.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[op.status]}`}>
                      {STATUS_LBL[op.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-[var(--text-secondary)]">
                    {op.rating > 0 ? (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[var(--warning)] fill-[var(--warning)]" />
                        {op.rating.toFixed(1)}
                        <span className="text-[var(--text-muted)] text-xs">({op.reviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs">Нет отзывов</span>
                    )}
                  </div>
                </div>
                {op.status === 'pending' ? (
                  <button
                    onClick={() => activate(op.id)}
                    disabled={acting === op.id}
                    className="min-h-[44px] px-3 py-2 rounded-lg text-sm border border-[var(--border)] inline-flex items-center gap-1.5 transition-colors text-[var(--success)] hover:bg-[var(--success)]/10 disabled:opacity-50"
                  >
                    {acting === op.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }
                    Верифицировать
                  </button>
                ) : (
                  <button
                    className="min-h-[44px] px-3 py-2 rounded-lg text-sm border border-[var(--border)] inline-flex items-center gap-1.5 text-[var(--text-muted)] cursor-not-allowed opacity-40"
                    title="Блокировка в разработке"
                    disabled
                  >
                    <Ban className="w-4 h-4" /> Заблокировать
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
