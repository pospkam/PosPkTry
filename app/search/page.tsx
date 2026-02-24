import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ModernTourSearch } from '@/components/ModernTourSearch';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Поиск туров — Kamchatour',
  description: 'Найдите идеальный тур на Камчатке: вулканы, рыбалка, термальные источники. Умный поиск с AI-помощником.',
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-transparent">
      {/* Шапка страницы */}
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-2 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
          Поиск туров
        </h1>
        <p className="text-white/50 text-sm sm:text-base max-w-md mx-auto">
          Вулканы, рыбалка, медведи, термальные источники — найдите своё приключение
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={36} className="text-sky-400 animate-spin" />
            <p className="text-white/40 text-sm">Загрузка поиска...</p>
          </div>
        }
      >
        <ModernTourSearch />
      </Suspense>
    </div>
  );
}
