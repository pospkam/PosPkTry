'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Building2, Search, Loader2, CheckCircle2, Ban, MapPin } from 'lucide-react';

interface Operator { id: string; name: string; status: 'active' | 'pending' | 'suspended'; toursCount: number; revenue: number; region: string; }

export default function OperatorsClient() {
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setOperators([
        { id: '1', name: 'Камчатская Рыбалка', status: 'active', toursCount: 11, revenue: 1200000, region: 'Камчатский край' },
        { id: '2', name: 'Вулканы Камчатки', status: 'active', toursCount: 8, revenue: 900000, region: 'Камчатский край' },
        { id: '3', name: 'Новый оператор', status: 'pending', toursCount: 0, revenue: 0, region: 'Камчатский край' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  function toggleStatus(id: string) {
    setOperators(prev => prev.map(o => o.id === id ? { ...o, status: o.status === 'active' ? 'suspended' as const : 'active' as const } : o));
  }

  const filtered = operators.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const STATUS_CLS: Record<string, string> = { active: 'bg-[var(--success)]/15 text-[var(--success)]', pending: 'bg-[var(--warning)]/15 text-[var(--warning)]', suspended: 'bg-[var(--danger)]/15 text-[var(--danger)]' };
  const STATUS_LBL: Record<string, string> = { active: 'Активен', pending: 'На проверке', suspended: 'Заблокирован' };

  return (
    <Protected roles={['admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><Building2 className="w-6 h-6 text-[var(--accent)]" /><h1 className="text-2xl font-bold text-[var(--text-primary)]">Операторы</h1></div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="min-h-[44px] pl-10 pr-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" /><p className="text-[var(--text-secondary)]">Операторы не найдены</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(op => (
              <div key={op.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium text-[var(--text-primary)]">{op.name}</span><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[op.status]}`}>{STATUS_LBL[op.status]}</span></div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{op.region}</span>
                    <span>{op.toursCount} туров</span>
                    <span className="text-[var(--accent)]">{(op.revenue / 1000).toFixed(0)}K rub</span>
                  </div>
                </div>
                <button onClick={() => toggleStatus(op.id)} className={`min-h-[44px] px-3 py-2 rounded-xl text-sm border border-[var(--border)] inline-flex items-center gap-1.5 transition-colors ${op.status === 'active' ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10' : 'text-[var(--success)] hover:bg-[var(--success)]/10'}`}>
                  {op.status === 'active' ? <><Ban className="w-4 h-4" />Заблокировать</> : <><CheckCircle2 className="w-4 h-4" />Активировать</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
