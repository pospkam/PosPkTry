'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Users, Star, Loader2, Search, UserCheck, UserX } from 'lucide-react';

interface Guide {
  id: string;
  name: string;
  rating: number;
  specializations: string[];
  status: 'active' | 'inactive';
  toursCount: number;
}

export default function GuidesClient() {
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Загрузка гидов оператора
    setTimeout(() => {
      setGuides([
        { id: '1', name: 'Иван Петров', rating: 4.9, specializations: ['Вулканы', 'Треккинг'], status: 'active', toursCount: 12 },
        { id: '2', name: 'Мария Сидорова', rating: 4.7, specializations: ['Рыбалка', 'Экотуры'], status: 'active', toursCount: 8 },
        { id: '3', name: 'Алексей Козлов', rating: 4.5, specializations: ['Вертолётные', 'Фото-туры'], status: 'inactive', toursCount: 5 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filtered = guides.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Protected roles={['operator', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Гиды</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск гида..." className="min-h-[44px] pl-10 pr-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Нет гидов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(guide => (
              <div key={guide.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)]">{guide.name}</p>
                    {guide.status === 'active' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--success)]/15 text-[var(--success)]">Активен</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--text-muted)]/15 text-[var(--text-muted)]">Неактивен</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{guide.rating}</span>
                    <span>{guide.toursCount} туров</span>
                    <span>{guide.specializations.join(', ')}</span>
                  </div>
                </div>
                <button className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors inline-flex items-center gap-1.5">
                  {guide.status === 'active' ? <><UserX className="w-4 h-4" /> Отключить</> : <><UserCheck className="w-4 h-4" /> Включить</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
