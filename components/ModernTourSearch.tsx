'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, SlidersHorizontal, X, Mic, MicOff, Sparkles,
  Clock, Star, ChevronDown, ChevronUp, Flame, Fish,
  TreePine, Waves, Wind, Mountain, MapPin, Users,
  Calendar, Banknote, RotateCcw, ArrowRight, Loader2,
} from 'lucide-react';

interface SearchFilters {
  query: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'any';
  activity?: string;
  duration?: number;
  guests?: number;
}

interface TourResult {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  difficulty: string;
  activities: string[];
  imageUrl?: string;
  rating?: number;
  reviews?: number;
  location?: string;
  category?: string;
}

const ACTIVITIES = [
  { id: 'volcano',     name: 'Вулканы',    Icon: Flame    },
  { id: 'fishing',     name: 'Рыбалка',    Icon: Fish     },
  { id: 'hiking',      name: 'Треккинг',   Icon: Mountain },
  { id: 'wildlife',    name: 'Медведи',    Icon: TreePine },
  { id: 'geysers',     name: 'Гейзеры',    Icon: Wind     },
  { id: 'hot-springs', name: 'Термалы',    Icon: Waves    },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  hard: 'text-red-400 bg-red-400/10 border-red-400/30',
};

export function ModernTourSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery    = searchParams.get('q')        || '';
  const initialActivity = searchParams.get('activity') || '';
  const initialDateFrom = searchParams.get('dateFrom') || '';
  const initialDateTo   = searchParams.get('dateTo')   || '';

  const [filters, setFilters] = useState<SearchFilters>({
    query:      initialQuery,
    difficulty: 'any',
    activity:   initialActivity || undefined,
    dateFrom:   initialDateFrom || undefined,
    dateTo:     initialDateTo   || undefined,
  });
  const [results, setResults]       = useState<TourResult[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI]         = useState(false);
  const [aiQuery, setAiQuery]       = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!(initialQuery || initialActivity));
  const searchTimeout = useRef<NodeJS.Timeout>();
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Проверка поддержки голосового ввода
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ru-RU';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setFilters(prev => ({ ...prev, query: transcript }));
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Автопоиск при переходе с главной с параметрами
  useEffect(() => {
    if (initialQuery || initialActivity) {
      performSearch();
    }
  }, []);

  // Живой поиск с debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    const hasFilters = filters.query.length >= 2 || filters.activity || filters.dateFrom;
    if (hasFilters) {
      searchTimeout.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else if (!initialQuery && !initialActivity) {
      setResults([]);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [filters]);

  const performSearch = useCallback(async (f: SearchFilters = filters) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (f.query)                          params.append('search',     f.query);
      if (f.difficulty && f.difficulty !== 'any') params.append('difficulty', f.difficulty);
      if (f.activity)                       params.append('activity',   f.activity);
      if (f.priceMin)                       params.append('priceMin',   f.priceMin.toString());
      if (f.priceMax)                       params.append('priceMax',   f.priceMax.toString());
      if (f.duration)                       params.append('duration',   f.duration.toString());
      if (f.dateFrom)                       params.append('dateFrom',   f.dateFrom);
      if (f.dateTo)                         params.append('dateTo',     f.dateTo);
      params.append('limit', '20');

      const response = await fetch(`/api/tours?${params}`);
      const data = await response.json();

      if (data.success && data.data?.tours) {
        setResults(data.data.tours);
        setTotal(data.data.total ?? data.data.tours.length);
      } else {
        setResults([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const response = await fetch('/api/ai/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Помоги подобрать тур на Камчатке: ${aiQuery}. Порекомендуй конкретные типы туров и активности. Ответь кратко — 2-3 предложения.`,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAiResponse(data.data.message);
        const kw = extractKeywords(data.data.message);
        const next = { ...filters, query: kw };
        setFilters(next);
        performSearch(next);
        setShowAI(false);
      }
    } catch {
      setAiResponse('Не удалось получить рекомендации. Попробуйте обычный поиск.');
    } finally {
      setAiLoading(false);
    }
  };

  const extractKeywords = (text: string): string => {
    const kws = ['вулкан', 'рыбалка', 'медведь', 'гейзер', 'восхождение', 'треккинг', 'термальн', 'океан', 'рафтинг'];
    const found = kws.filter(k => text.toLowerCase().includes(k));
    return found.join(' ') || text.split(' ').slice(0, 3).join(' ');
  };

  const toggleVoice = () => {
    if (!voiceSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try { recognitionRef.current.start(); setIsListening(true); }
      catch { /* ignore */ }
    }
  };

  const resetFilters = () => {
    const clean: SearchFilters = { query: '', difficulty: 'any' };
    setFilters(clean);
    setResults([]);
    setTotal(0);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const activeFilterCount = [
    filters.difficulty && filters.difficulty !== 'any',
    filters.priceMin, filters.priceMax,
    filters.duration, filters.dateFrom, filters.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* ── AI-панель (модальная) ─────────────────────────────────── */}
      {showAI && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAI(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setShowAI(false)}
          aria-label="Закрыть AI-помощник"
        >
          <div
            className="relative w-full max-w-lg bg-[#0D1B2A] border border-sky-400/20 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="AI-помощник поиска"
          >
            {/* Заголовок */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">AI-помощник поиска</h3>
                  <p className="text-white/50 text-xs mt-0.5">Опишите тур своими словами</p>
                </div>
              </div>
              <button
                onClick={() => setShowAI(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {/* Примеры */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                'Вулкан + медведи, 3 дня',
                'Рыбалка для новичков',
                'Романтика + термальные источники',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setAiQuery(ex)}
                  className="px-3 py-1.5 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-300 text-xs hover:bg-sky-400/20 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Например: хочу активный тур на 5 дней, без экстрима, с видом на вулкан..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-sky-400/50 focus:bg-white/8 transition-all"
            />

            {/* Кнопка */}
            <button
              onClick={handleAISearch}
              disabled={aiLoading || !aiQuery.trim()}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/20"
            >
              {aiLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Анализирую...</>
              ) : (
                <><Sparkles size={16} /> Найти с AI</>
              )}
            </button>

            {aiResponse && (
              <div className="mt-4 p-4 rounded-2xl bg-sky-400/5 border border-sky-400/15">
                <p className="text-xs text-sky-300 font-medium mb-1">Рекомендация AI</p>
                <p className="text-white/80 text-sm leading-relaxed">{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Поисковая строка ─────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-xl shadow-xl">
        {/* Основной инпут */}
        <form
          onSubmit={(e) => { e.preventDefault(); performSearch(); }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Вулкан, рыбалка, медведи, гейзеры..."
              aria-label="Поиск туров"
              className="w-full pl-11 pr-4 py-3 bg-white/8 border border-white/10 rounded-2xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-400/50 focus:bg-white/12 transition-all"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, query: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                aria-label="Очистить запрос"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Голос */}
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={isListening ? 'Остановить запись' : 'Голосовой ввод'}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500/20 border border-red-400/40 text-red-400 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          {/* AI */}
          <button
            type="button"
            onClick={() => setShowAI(true)}
            aria-label="AI-помощник"
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-400/20 text-sky-400 hover:from-sky-500/30 hover:to-violet-500/30 flex items-center justify-center transition-all"
          >
            <Sparkles size={16} />
          </button>

          {/* Фильтры */}
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            aria-label="Фильтры"
            aria-expanded={showFilters}
            className={`flex items-center gap-2 px-4 h-11 rounded-2xl border text-sm font-medium transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-sky-400/15 border-sky-400/40 text-sky-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Фильтры</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-400 text-[#0B1120] text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Кнопка поиска */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all disabled:opacity-60 shadow-lg shadow-sky-500/20"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span className="hidden sm:inline">Найти</span>
          </button>
        </form>

        {/* Быстрые категории */}
        <div className="flex flex-wrap gap-2 mt-4">
          {ACTIVITIES.map(({ id, name, Icon }) => {
            const active = filters.activity === id;
            return (
              <button
                key={id}
                onClick={() => {
                  const next = { ...filters, activity: active ? undefined : id };
                  setFilters(next);
                  performSearch(next);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  active
                    ? 'bg-sky-400/20 border-sky-400/50 text-sky-300'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={13} />
                {name}
              </button>
            );
          })}
        </div>

        {/* Расширенные фильтры */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Сложность */}
              <div className="space-y-1.5">
                <label htmlFor="f-difficulty" className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <Mountain size={12} /> Сложность
                </label>
                <select
                  id="f-difficulty"
                  value={filters.difficulty}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as SearchFilters['difficulty'] }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-400/50 transition-colors"
                >
                  <option value="any">Любая</option>
                  <option value="easy">Лёгкий</option>
                  <option value="medium">Средний</option>
                  <option value="hard">Сложный</option>
                </select>
              </div>

              {/* Цена от */}
              <div className="space-y-1.5">
                <label htmlFor="f-price-min" className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <Banknote size={12} /> Цена от, ₽
                </label>
                <input
                  id="f-price-min"
                  type="number"
                  min={0}
                  value={filters.priceMin ?? ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMin: parseInt(e.target.value) || undefined }))}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors"
                />
              </div>

              {/* Цена до */}
              <div className="space-y-1.5">
                <label htmlFor="f-price-max" className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <Banknote size={12} /> Цена до, ₽
                </label>
                <input
                  id="f-price-max"
                  type="number"
                  min={0}
                  value={filters.priceMax ?? ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMax: parseInt(e.target.value) || undefined }))}
                  placeholder="∞"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors"
                />
              </div>

              {/* Длительность */}
              <div className="space-y-1.5">
                <label htmlFor="f-duration" className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <Clock size={12} /> Дней
                </label>
                <input
                  id="f-duration"
                  type="number"
                  min={1}
                  value={filters.duration ?? ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, duration: parseInt(e.target.value) || undefined }))}
                  placeholder="Любая"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors"
                />
              </div>

              {/* Дата от */}
              <div className="space-y-1.5">
                <label htmlFor="f-date-from" className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <Calendar size={12} /> Дата начала
                </label>
                <input
                  id="f-date-from"
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-400/50 transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Дата до */}
              <div className="space-y-1.5">
                <label htmlFor="f-date-to" className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <Calendar size={12} /> Дата конца
                </label>
                <input
                  id="f-date-to"
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-400/50 transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Гости */}
              <div className="space-y-1.5">
                <label htmlFor="f-guests" className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                  <Users size={12} /> Человек
                </label>
                <input
                  id="f-guests"
                  type="number"
                  min={1}
                  max={100}
                  value={filters.guests ?? ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, guests: parseInt(e.target.value) || undefined }))}
                  placeholder="1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors"
                />
              </div>
            </div>

            {/* Сброс */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="mt-3 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <RotateCcw size={12} /> Сбросить все фильтры
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Результаты ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 size={36} className="text-sky-400 animate-spin" />
          <p className="text-white/50 text-sm">Ищем туры...</p>
        </div>
      )}

      {!loading && hasSearched && results.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-white/60 text-sm">
              Найдено: <span className="text-white font-semibold">{total}</span> туров
            </p>
            {aiResponse && (
              <p className="text-sky-400 text-xs flex items-center gap-1">
                <Sparkles size={12} /> AI-подбор активен
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((tour) => (
              <Link
                key={tour.id}
                href={`/tours/${tour.id}`}
                className="group bg-white/5 border border-white/8 rounded-3xl overflow-hidden hover:border-sky-400/30 hover:bg-white/8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-500/10"
              >
                {/* Изображение */}
                <div className="relative h-44 bg-white/5 overflow-hidden">
                  {tour.imageUrl ? (
                    <Image
                      src={tour.imageUrl}
                      alt={tour.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Mountain size={40} className="text-white/10" />
                    </div>
                  )}
                  {/* Бейдж сложности */}
                  {tour.difficulty && tour.difficulty !== 'any' && (
                    <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${DIFFICULTY_COLORS[tour.difficulty] ?? 'text-white/60 bg-white/10 border-white/20'}`}>
                      {DIFFICULTY_LABELS[tour.difficulty] ?? tour.difficulty}
                    </span>
                  )}
                  {/* Цена */}
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
                    от {tour.price?.toLocaleString('ru-RU')} ₽
                  </div>
                </div>

                {/* Контент */}
                <div className="p-4 space-y-2">
                  <h4 className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-sky-300 transition-colors">
                    {tour.title}
                  </h4>
                  <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
                    {tour.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3 text-white/40 text-xs">
                      {tour.duration && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {tour.duration}
                        </span>
                      )}
                      {tour.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {tour.location}
                        </span>
                      )}
                    </div>
                    {tour.rating != null && (
                      <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                        <Star size={11} className="fill-amber-400" />
                        {tour.rating.toFixed(1)}
                        {tour.reviews ? <span className="text-white/30 font-normal">({tour.reviews})</span> : null}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <span className="flex items-center gap-1 text-sky-400 text-xs font-medium group-hover:gap-2 transition-all">
                      Подробнее <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Search size={28} className="text-white/20" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-1">Ничего не найдено</h3>
            <p className="text-white/40 text-sm max-w-xs">
              Попробуйте изменить запрос, убрать фильтры или спросить AI-помощника
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
            >
              <RotateCcw size={14} /> Сбросить
            </button>
            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-500/15 border border-sky-400/30 text-sky-300 hover:bg-sky-500/25 text-sm transition-colors"
            >
              <Sparkles size={14} /> Спросить AI
            </button>
          </div>
        </div>
      )}

      {/* Начальное состояние — популярные запросы */}
      {!hasSearched && !loading && (
        <div className="space-y-4">
          <p className="text-white/40 text-sm px-1">Популярные направления</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Восхождение на Авачинский', activity: 'volcano', Icon: Flame },
              { label: 'Рыбалка на лосося',         activity: 'fishing', Icon: Fish  },
              { label: 'Долина Гейзеров',            activity: 'geysers', Icon: Wind  },
              { label: 'Медведи на Курилах',         activity: 'wildlife', Icon: TreePine },
              { label: 'Термальные источники',       activity: 'hot-springs', Icon: Waves },
              { label: 'Треккинг по вулканам',       activity: 'hiking', Icon: Mountain },
            ].map(({ label, activity, Icon }) => (
              <button
                key={activity}
                onClick={() => {
                  const next = { ...filters, activity, query: label };
                  setFilters(next);
                  performSearch(next);
                }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-sky-400/20 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-400/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-400/20 transition-colors">
                  <Icon size={16} className="text-sky-400" />
                </div>
                <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
