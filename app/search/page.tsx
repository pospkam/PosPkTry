import { Metadata } from 'next';
import { Suspense } from 'react';
import { ModernTourSearch } from '@/components/ModernTourSearch';

export const metadata: Metadata = {
  title: 'Поиск туров | Kamchatour',
  description: 'Найдите идеальный тур на Камчатке: вулканы, рыбалка, термальные источники, медведи.',
  alternates: { canonical: 'https://kamchatourhub.ru/search' },
};

export default function SearchPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">
        Поиск туров
      </h1>
      <Suspense fallback={<div className="text-[var(--text-muted)]">Загрузка...</div>}>
        <ModernTourSearch />
      </Suspense>
    </div>
  );
}
