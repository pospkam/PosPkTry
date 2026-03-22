'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Search, MapPin, Star, Shield } from 'lucide-react';

interface OperatorCard {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string | null;
  heroImage: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  operator:   'Туроператор',
  guide:      'Гид',
  transfer:   'Трансфер',
  agent:      'Агент',
};

export default function OperatorsPageClient() {
  const [operators, setOperators] = useState<OperatorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (search) params.set('search', search);
        const res = await fetch(`/api/operators?${params}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) setOperators(json.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)]">
        {/* Hero */}
        <section className="py-12 px-4 text-center">
          <h1 className="ds-h1 mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
            Партнёры платформы
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Проверенные операторы, гиды и базы Камчатки. Каждый партнёр прошёл верификацию.
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск партнёра..."
              className="ds-input w-full pl-10"
            />
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="ds-card p-0 overflow-hidden animate-pulse">
                  <div className="h-48 bg-[var(--bg-hover)]" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-[var(--bg-hover)] rounded w-2/3" />
                    <div className="h-4 bg-[var(--bg-hover)] rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : operators.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">
                {search ? 'Ничего не найдено' : 'Партнёры скоро появятся'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {operators.map(op => (
                <Link
                  key={op.id}
                  href={`/operators/${op.slug}`}
                  className="ds-card p-0 overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-[var(--bg-hover)]">
                    {op.heroImage ? (
                      <Image
                        src={op.heroImage}
                        alt={op.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <MapPin className="w-10 h-10 text-[var(--text-muted)]" />
                      </div>
                    )}
                    {op.isVerified && (
                      <div className="absolute top-3 left-3 bg-[var(--success)] text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Проверен
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                        {op.name}
                      </h3>
                      {op.rating > 0 && (
                        <div className="flex items-center gap-1 text-sm text-[var(--warning)] shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {op.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                      {CATEGORY_LABELS[op.category] ?? op.category}
                    </span>
                    {op.shortDescription && (
                      <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">
                        {op.shortDescription}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
