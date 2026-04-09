'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp, ThumbsUp } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  helpful: number;
}

interface FaqCategory {
  category: string;
  count: string;
}

interface Props {
  initialItems?: FaqItem[];
}

export default function FaqClient({ initialItems = [] }: Props) {
  const [items, setItems] = useState<FaqItem[]>(initialItems);
  const [categories, setCategories] = useState<FaqCategory[]>(() => {
    const map: Record<string, number> = {};
    for (const item of initialItems) {
      if (item.category) map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return Object.entries(map).map(([category, count]) => ({ category, count: String(count) }));
  });
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchFaq = useCallback(async () => {
    if (!activeCategory && !search) return; // используем initialItems
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      if (search) params.set('search', search);
      const res = await fetch(`/api/faq?${params}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [activeCategory, search]);

  useEffect(() => { fetchFaq(); }, [fetchFaq]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <HelpCircle className="w-8 h-8 text-[var(--accent)] mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Часто задаваемые вопросы</h1>
          <p className="text-sm text-[var(--text-muted)]">Найдите ответы на популярные вопросы о турах по Камчатке</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по вопросам..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                !activeCategory
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              Все
            </button>
            {categories.map(cat => (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  activeCategory === cat.category
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {cat.category} <span className="text-[var(--text-muted)]">({cat.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* FAQ List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
            <HelpCircle className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">Вопросов пока нет</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)] pr-4">{item.question}</span>
                  {openId === item.id ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                </button>
                {openId === item.id && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-[var(--border)] pt-3">
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{item.answer}</p>
                      {item.category && (
                        <span className="inline-block mt-3 px-2 py-0.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] rounded">
                          {item.category}
                        </span>
                      )}
                      {item.helpful > 0 && (
                        <span className="inline-flex items-center gap-1 mt-3 ml-2 text-[10px] text-[var(--text-muted)]">
                          <ThumbsUp className="w-2.5 h-2.5" /> {item.helpful} считают полезным
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
