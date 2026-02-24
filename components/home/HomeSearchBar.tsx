'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Calendar, Users, MapPin, ChevronDown, ChevronUp, X, Minus, Plus, Mountain, Compass, Waves } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * HomeSearchBar — полноценный виджет поиска туров на главной.
 * Glassmorphism, рабочие даты, гости (взрослые/дети), категории.
 */

const CATEGORIES = [
  { id: 'volcano', label: 'Вулканы', emoji: '🌋' },
  { id: 'fishing', label: 'Рыбалка', emoji: '🎣' },
  { id: 'hot-springs', label: 'Термалы', emoji: '♨️' },
  { id: 'hiking', label: 'Треккинг', emoji: '🥾' },
  { id: 'wildlife', label: 'Медведи', emoji: '🐻' },
  { id: 'ocean', label: 'Океан', emoji: '🌊' },
];

interface HomeSearchBarProps {
  onSearch?: (query: string) => void;
}

export function HomeSearchBar({ onSearch }: HomeSearchBarProps) {
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedSection, setExpandedSection] = useState<'dates' | 'guests' | 'category' | null>(null);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике снаружи
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpandedSection(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      onSearch?.(query.trim());
      params.append('q', query.trim());
    }
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const totalGuests = adults + children;
    if (totalGuests > 0) params.append('guests', totalGuests.toString());
    if (adults > 0) params.append('adults', adults.toString());
    if (children > 0) params.append('children', children.toString());
    if (selectedCategory) params.append('activity', selectedCategory);

    router.push(`/search?${params.toString()}`);
  };

  const toggleSection = (section: 'dates' | 'guests' | 'category') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const totalGuests = adults + children;

  const formatDateShort = (date: string) => {
    if (!date) return null;
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const dateDisplay = () => {
    if (dateFrom && dateTo) return `${formatDateShort(dateFrom)} — ${formatDateShort(dateTo)}`;
    if (dateFrom) return `с ${formatDateShort(dateFrom)}`;
    return 'Выбрать даты';
  };

  const getCategoryLabel = () => {
    if (!selectedCategory) return 'Все виды';
    const cat = CATEGORIES.find(c => c.id === selectedCategory);
    return cat ? `${cat.emoji} ${cat.label}` : 'Все виды';
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} aria-label="Поиск туров на Камчатке" className="w-full" ref={containerRef}>
      <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-[28px] shadow-lg shadow-black/10 overflow-hidden">

        {/* ─── Строка 1: Куда ─── */}
        <div className="flex items-center px-5 py-4 border-b border-white/10">
          <MapPin size={20} className="text-white/80 mr-3 flex-shrink-0" />
          <input
            type="search"
            id="home-search-query"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Куда хотите поехать?"
            autoComplete="off"
            aria-label="Направление поиска"
            className="bg-transparent text-white placeholder-white/60 w-full focus:outline-none text-[16px] font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="ml-2 text-white/50 hover:text-white transition-colors"
              aria-label="Очистить поле поиска"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ─── Строка 2: Даты ─── */}
        <div className="border-b border-white/10">
          <button
            type="button"
            onClick={() => toggleSection('dates')}
            className="w-full flex items-center justify-between px-5 py-3.5 text-white hover:bg-white/5 transition-colors"
            aria-expanded={expandedSection === 'dates'}
            aria-controls="search-dates-panel"
          >
            <div className="flex items-center">
              <Calendar size={20} className="text-white/80 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider leading-none mb-1">Даты поездки</div>
                <div className={`text-sm font-semibold leading-none ${dateFrom ? 'text-white' : 'text-white/60'}`}>
                  {dateDisplay()}
                </div>
              </div>
            </div>
            {expandedSection === 'dates' ? <ChevronUp size={18} className="text-white/50" /> : <ChevronDown size={18} className="text-white/50" />}
          </button>

          {expandedSection === 'dates' && (
            <div id="search-dates-panel" className="px-5 pb-4 pt-1">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="search-date-from" className="block text-[11px] text-white/50 font-bold uppercase tracking-wider mb-1.5">Заезд</label>
                  <input
                    id="search-date-from"
                    type="date"
                    value={dateFrom}
                    min={today}
                    onChange={e => {
                      setDateFrom(e.target.value);
                      if (dateTo && e.target.value > dateTo) setDateTo(e.target.value);
                    }}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/40 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="search-date-to" className="block text-[11px] text-white/50 font-bold uppercase tracking-wider mb-1.5">Выезд</label>
                  <input
                    id="search-date-to"
                    type="date"
                    value={dateTo}
                    min={dateFrom || today}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/40 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="mt-2 text-xs text-white/40 hover:text-white/70 transition-colors">
                  Сбросить даты
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Строка 3: Гости ─── */}
        <div className="border-b border-white/10">
          <button
            type="button"
            onClick={() => toggleSection('guests')}
            className="w-full flex items-center justify-between px-5 py-3.5 text-white hover:bg-white/5 transition-colors"
            aria-expanded={expandedSection === 'guests'}
            aria-controls="search-guests-panel"
          >
            <div className="flex items-center">
              <Users size={20} className="text-white/80 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider leading-none mb-1">Туристы</div>
                <div className="text-sm font-semibold leading-none text-white">
                  {totalGuests} {totalGuests === 1 ? 'гость' : totalGuests >= 2 && totalGuests <= 4 ? 'гостя' : 'гостей'}
                </div>
              </div>
            </div>
            {expandedSection === 'guests' ? <ChevronUp size={18} className="text-white/50" /> : <ChevronDown size={18} className="text-white/50" />}
          </button>

          {expandedSection === 'guests' && (
            <div id="search-guests-panel" className="px-5 pb-4 pt-1 space-y-3">
              {/* Взрослые */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Взрослые</div>
                  <div className="text-xs text-white/40">от 18 лет</div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} disabled={adults <= 1}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                    aria-label="Уменьшить количество взрослых">
                    <Minus size={14} />
                  </button>
                  <span className="text-white font-bold text-lg w-6 text-center">{adults}</span>
                  <button type="button" onClick={() => setAdults(Math.min(20, adults + 1))} disabled={adults >= 20}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                    aria-label="Увеличить количество взрослых">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {/* Дети */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Дети</div>
                  <div className="text-xs text-white/40">до 17 лет</div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setChildren(Math.max(0, children - 1))} disabled={children <= 0}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                    aria-label="Уменьшить количество детей">
                    <Minus size={14} />
                  </button>
                  <span className="text-white font-bold text-lg w-6 text-center">{children}</span>
                  <button type="button" onClick={() => setChildren(Math.min(10, children + 1))} disabled={children >= 10}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                    aria-label="Увеличить количество детей">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Строка 4: Категория ─── */}
        <div className="border-b border-white/10">
          <button
            type="button"
            onClick={() => toggleSection('category')}
            className="w-full flex items-center justify-between px-5 py-3.5 text-white hover:bg-white/5 transition-colors"
            aria-expanded={expandedSection === 'category'}
            aria-controls="search-category-panel"
          >
            <div className="flex items-center">
              <Compass size={20} className="text-white/80 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider leading-none mb-1">Тип тура</div>
                <div className={`text-sm font-semibold leading-none ${selectedCategory ? 'text-white' : 'text-white/60'}`}>
                  {getCategoryLabel()}
                </div>
              </div>
            </div>
            {expandedSection === 'category' ? <ChevronUp size={18} className="text-white/50" /> : <ChevronDown size={18} className="text-white/50" />}
          </button>

          {expandedSection === 'category' && (
            <div id="search-category-panel" className="px-5 pb-4 pt-1">
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(isActive ? '' : cat.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all
                        ${isActive
                          ? 'bg-white/20 border-white/30 text-white shadow-sm'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                        }`}
                      aria-pressed={isActive}
                      aria-label={`Выбрать категорию ${cat.label}`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-[11px] font-semibold leading-none">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedCategory && (
                <button type="button" onClick={() => setSelectedCategory('')} className="mt-2 text-xs text-white/40 hover:text-white/70 transition-colors">
                  Сбросить категорию
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Кнопка поиска ─── */}
        <div className="p-3">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-[16px] py-4 rounded-2xl flex items-center justify-center gap-2.5 hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/25"
          >
            <Search size={20} strokeWidth={2.5} />
            Найти туры
          </button>
        </div>

      </div>
    </form>
  );
}

