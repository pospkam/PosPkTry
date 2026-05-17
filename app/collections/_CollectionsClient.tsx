'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Mountain, Flame, Leaf, Users } from 'lucide-react';

interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  tags: string[];
  view_count: number;
  place_count: number | null;
  route_count: number | null;
}

const TAG_ICONS: Record<string, React.ElementType> = {
  вулканы: Flame,
  источники: Flame,
  природа: Leaf,
  животные: Leaf,
  треккинг: Mountain,
  'лёгкие маршруты': Mountain,
  семьи: Users,
};

function CollectionCard({ col }: { col: Collection }) {
  const itemCount = (col.place_count ?? 0) + (col.route_count ?? 0);
  return (
    <Link
      href={`/collections/${col.slug}`}
      className="ds-card block group hover:shadow-lg transition-all duration-200"
    >
      {col.cover_image ? (
        <img src={col.cover_image} alt={col.title} className="w-full h-48 object-cover rounded-t-lg" />
      ) : (
        <div className="w-full h-48 rounded-t-lg bg-[var(--bg-hover)] flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-[var(--text-muted)]" />
        </div>
      )}
      <div className="p-5">
        <div className="flex flex-wrap gap-1 mb-3">
          {col.tags.slice(0, 3).map(tag => (
            <span key={tag} className="ds-badge text-xs">{tag}</span>
          ))}
        </div>
        <h2 className="font-playfair text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-2">
          {col.title}
        </h2>
        {col.description && (
          <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-3">{col.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{itemCount > 0 ? `${itemCount} объектов` : 'Подборка'}</span>
          <span>{col.view_count.toLocaleString('ru')} просмотров</span>
        </div>
      </div>
    </Link>
  );
}

export function CollectionsClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    const url = activeTag
      ? `/api/collections?tag=${encodeURIComponent(activeTag)}`
      : '/api/collections';
    fetch(url)
      .then(r => r.json())
      .then(d => setCollections(d.collections ?? []))
      .finally(() => setLoading(false));
  }, [activeTag]);

  const allTags = Array.from(new Set(collections.flatMap(c => c.tags)));

  return (
    <main className="ds-page min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-10">
          <p className="text-[var(--accent)] font-semibold text-sm uppercase tracking-widest mb-2">Подборки</p>
          <h1 className="ds-h1 mb-3">Кураторские маршруты Камчатки</h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
            Тщательно подобранные места и маршруты по темам — от вулканов до горячих источников
          </p>
        </header>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveTag(null)}
              className={`ds-badge cursor-pointer transition-colors ${!activeTag ? 'bg-[var(--accent)] text-white' : ''}`}
            >
              Все
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`ds-badge cursor-pointer transition-colors ${activeTag === tag ? 'bg-[var(--accent)] text-white' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ds-card">
                <div className="ds-skeleton h-48 rounded-t-lg" />
                <div className="p-5 space-y-3">
                  <div className="ds-skeleton h-4 w-2/3" />
                  <div className="ds-skeleton h-6 w-full" />
                  <div className="ds-skeleton h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Подборок пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map(col => (
              <CollectionCard key={col.id} col={col} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
