import { Suspense } from 'react';
import { ModernTourSearch } from '@/components/ModernTourSearch';

export const metadata = {
  title: 'Поиск туров - Kamchatour',
  description: 'Найдите идеальный тур на Камчатке с помощью умного поиска и AI-помощника',
};

export default function SearchPage() {
  return (
    <div className="search-page-container">
      <div className="search-page-header">
        <h1 className="search-page-title gradient-text">Поиск туров</h1>
        <p className="search-page-subtitle">
          Найдите идеальное приключение на Камчатке
        </p>
      </div>
      
      <Suspense fallback={<div className="search-loading"><div className="spinner-large"></div><p>Загрузка...</p></div>}>
        <ModernTourSearch />
      </Suspense>
    </div>
  );
}
