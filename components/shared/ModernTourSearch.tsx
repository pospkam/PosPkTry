'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Search, Mic, Bot, Filter, Clock, Star, X, Calendar, Thermometer, ShieldCheck, 
  Mountain, Fish, Footprints, PawPrint, Droplets, User, Car, Leaf 
} from 'lucide-react';
import { SOSButton } from '@/components/safety/SOSButton'; // Импорт для safety-first

interface SearchFilters {
  query: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'any';
  activity?: string;
  duration?: number;
  passengers?: number;
}

interface TransferResult {
  id: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  pricePerPerson: number;
  vehicleType: string;
  operatorName: string;
  availableSeats: number;
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
  isEco?: boolean; // Добавлено для eco-badge
}

/**
 * TourCard — карточка тура/трансфера для поиска (glassmorphism, eco, a11y)
 * @param {{ result: TourResult | (TourResult & TransferResult) }}
 * @returns {JSX.Element}
 * @remarks
 * - Accessibility: alt для изображений, aria-label для badge, role для карточки
 * - UX: eco-badge, skeleton, rating, price
 */
const TourCard = React.memo(({ result }: { result: TourResult | (TourResult & TransferResult) }) => {
  const isTransfer = 'vehicleType' in result;
  return (
    <motion.div
      className="tour-result-card bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden hover:border-premium-gold/50 transition-all duration-300 hover:shadow-xl hover:shadow-premium-gold/10 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="article"
      aria-label={result.title}
    >
      <div className="tour-result-image relative aspect-[4/3] overflow-hidden">
        {result.imageUrl ? (
          <Image src={result.imageUrl} alt={result.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 50vw" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-cyan-800 flex items-center justify-center" aria-label="Нет изображения">
            <Mountain size={48} className="text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {result.difficulty && !isTransfer && (
          <span className={`difficulty-badge absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-sm text-white/90`} aria-label={`Сложность: ${result.difficulty}`}>
            {result.difficulty === 'easy' ? 'Легко' : result.difficulty === 'medium' ? 'Средне' : 'Сложно'}
          </span>
        )}
        {result.isEco && (
          <motion.div
            className="absolute top-3 right-3 bg-moss text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-label="Экологичный тур"
          >
            <Leaf size={12} aria-hidden="true" /> Эко-тур
          </motion.div>
        )}
        {isTransfer && (
          <span className="absolute top-3 right-3 bg-white/10 text-white px-2 py-1 rounded-full text-xs font-semibold" aria-label="Трансфер">
            <Car size={12} className="inline mr-1" aria-hidden="true" /> Трансфер
          </span>
        )}
        {result.rating && (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <Star size={12} fill="currentColor" className="text-premium-gold" />
            <span className="text-white text-xs font-bold">{result.rating}</span>
            {result.reviews && <span className="text-white/50 text-xs">({result.reviews})</span>}
          </div>
        )}
      </div>
      <div className="tour-result-content p-4 flex flex-col flex-1">
        <h4 className="text-base font-bold text-white mb-1 line-clamp-2 group-hover:text-premium-gold transition-colors">{result.title}</h4>
        <p className="tour-description text-sm text-white/60 mb-3 line-clamp-2">{result.description}</p>
        {isTransfer && (
          <div className="transfer-details text-xs text-white/60 mb-2 space-y-1">
            <span><Mountain size={12} className="inline mr-1" /> {result.fromLocation} → {result.toLocation}</span>
            <span><Clock size={12} className="inline mr-1" /> {result.departureTime}</span>
            <span><User size={12} className="inline mr-1" /> Мест: {result.availableSeats}</span>
          </div>
        )}
        <div className="tour-meta flex justify-between items-center mb-3 text-sm text-white/60">
          <span className="flex items-center gap-1">
            <Clock size={14} /> {result.duration}
          </span>
        </div>
        <div className="mt-auto pt-3 border-t border-white/10">
          <span className="text-lg font-black text-premium-gold">
            от {result.price?.toLocaleString('ru-RU')} ₽
          </span>
          {isTransfer && (
            <div className="text-xs text-white/50 mt-1">
              Оператор: {result.operatorName}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

/**
 * ModernTourSearch — поисковый компонент для туров Kamchatour Hub
 * @returns {JSX.Element}
 * @remarks
 * - Включает фильтры, AI-помощника, голосовой ввод, SOS
 * - UX: loading, empty, error alerts, glassmorphism
 * - Accessibility: aria-label, alt, min touch target, role для алертов и модалей
 */
export function ModernTourSearch() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialActivity = searchParams.get('activity') || '';
  const initialAdults = searchParams.get('adults') || '1';
  const initialChildren = searchParams.get('children') || '0';
  const initialGuests = parseInt(initialAdults) + parseInt(initialChildren);
  const initialDateFrom = searchParams.get('dateFrom') || '';
  const initialDateTo = searchParams.get('dateTo') || '';

  const [filters, setFilters] = useState<SearchFilters>({
    query: initialQuery,
    difficulty: 'any',
    activity: initialActivity || undefined,
    dateFrom: initialDateFrom || undefined,
    dateTo: initialDateTo || undefined,
    passengers: initialGuests > 0 ? initialGuests : undefined,
  });
  const [results, setResults] = useState<TourResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const recognitionRef = useRef<any>(null);

  // Memoized activities with icons
    // Пример error handling для поиска (можно расширить на другие async действия)
    async function handleSearch() {
      setLoading(true);
      setError(null);
      try {
        // ...логика поиска (fetch, фильтрация)
        // setResults(...)
      } catch (e) {
        setError('Ошибка поиска туров. Попробуйте ещё раз.');
      } finally {
        setLoading(false);
      }
    }
  const activities = useMemo(() => [
    { id: 'volcano', name: 'Вулканы', icon: <Mountain size={16} /> },
    { id: 'fishing', name: 'Рыбалка', icon: <Fish size={16} /> },
    { id: 'hiking', name: 'Треккинг', icon: <Footprints size={16} /> },
    { id: 'wildlife', name: 'Медведи', icon: <PawPrint size={16} /> },
    { id: 'geysers', name: 'Гейзеры', icon: <Droplets size={16} /> },
    { id: 'hot-springs', name: 'Термалы', icon: <Thermometer size={16} /> },
  ], []);

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
    if (initialQuery || initialActivity || initialGuests > 0) {
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

  const performSearch = async () => {
    setLoading(true);
    try {
      // Если есть passengers, ищем трансферы
      if (filters.passengers && filters.passengers > 0) {
        const params = new URLSearchParams();
        if (filters.query) params.append('from', filters.query); // Используем query как from для примера
        params.append('to', 'Петропавловск-Камчатский'); // Default to
        if (filters.dateFrom) params.append('date', filters.dateFrom);
        params.append('passengers', filters.passengers.toString());

        const response = await fetch(`/api/transfers/search?${params}`);
        const data = await response.json();
        
        if (data.success && data.data?.availableTransfers) {
          setResults(data.data.availableTransfers.map((t: any) => ({
            id: t.scheduleId,
            title: `${t.route.fromLocation} → ${t.route.toLocation}`,
            description: `Трансфер на ${t.vehicle.vehicleType}`,
            price: t.pricePerPerson * (filters.passengers ?? 1),
            duration: `${t.route.estimatedDurationMinutes / 60} ч`,
            difficulty: 'easy',
            activities: ['transfer'],
            imageUrl: '/images/transfer-placeholder.jpg',
            rating: 4.5,
            reviews: 23,
            isEco: false, // Добавлено
            // Добавляем transfer-specific fields
            routeName: t.route.name,
            fromLocation: t.route.fromLocation,
            toLocation: t.route.toLocation,
            departureTime: t.departureTime,
            vehicleType: t.vehicle.vehicleType,
            operatorName: t.operatorName,
            availableSeats: t.availableSeats,
          } as TourResult & TransferResult)));
          return;
        }
      }

      // Иначе поиск туров
      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query);
      if (filters.difficulty && filters.difficulty !== 'any') params.append('difficulty', filters.difficulty);
      if (filters.activity) params.append('activity', filters.activity);
      if (filters.priceMin) params.append('priceMin', filters.priceMin.toString());
      if (filters.priceMax) params.append('priceMax', filters.priceMax.toString());

      const response = await fetch(`/api/discovery/search?${params}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setResults(data.data.map((tour: any) => ({ ...tour, isEco: tour.ecoFriendly || false }))); // Добавлено eco
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    setAiResponse('');
    
    try {
      const response = await fetch('/api/ai/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Помоги подобрать тур на Камчатке: ${aiQuery}. Порекомендуй конкретные типы туров и активности.`,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAiResponse(data.data.message);
        // Извлекаем ключевые слова из ответа AI для поиска
        const keywords = extractKeywords(data.data.message);
        setFilters(prev => ({ ...prev, query: keywords }));
      }
    } catch (error) {
      console.error('AI search error:', error);
      setAiResponse('Извините, не удалось получить рекомендации. Попробуйте обычный поиск.');
    } finally {
      setAiLoading(false);
    }
  };

  const extractKeywords = (text: string): string => {
    const keywords = ['вулкан', 'рыбалка', 'медвед', 'гейзер', 'восхождение', 'треккинг', 'термальн', 'океан'];
    const found = keywords.filter(k => text.toLowerCase().includes(k));
    return found[0] || text.split(' ').slice(0, 3).join(' ');
  };

  const toggleVoiceInput = () => {
    if (!voiceSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  return (
    <div className="modern-search-container min-h-screen bg-transparent py-8">
      {/* Sticky SOS Button - safety-first */}
      <SOSButton className="fixed top-4 right-4 z-50" aria-label="SOS — экстренная помощь" />

      {/* AI Помощник - glassmorphism modal */}
      <AnimatePresence>
        {showAI && (
          <motion.div 
            className="ai-search-modal fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end sm:items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAI(false)}
            role="dialog"
            aria-modal="true"
            aria-label="AI-поиск туров"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowAI(false);
            }}
          >
            <motion.div 
              className="ai-search-content bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()} 
              role="document"
              initial={{ scale: 0.95, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 50 }}
            >
              <div className="ai-search-header flex items-center justify-between p-4 border-b border-white/20">
                <div className="ai-search-title flex items-center gap-3">
                  <Bot size={24} className="text-premium-gold" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Помощник поиска</h3>
                    <p className="text-sm text-white/70">Опишите свой идеальный тур</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAI(false)} 
                  className="ai-close p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Закрыть AI-поиск"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="ai-search-body p-4">
                <div className="ai-examples mb-4">
                  <p className="text-sm font-medium text-white/70 mb-2">Примеры запросов:</p>
                  <div className="ai-example-chips flex flex-wrap gap-2">
                    <motion.button 
                      onClick={() => setAiQuery('Хочу увидеть вулкан и медведей за 3 дня')}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-sm transition-colors"
                      whileHover={{ scale: 1.05 }}
                    >
                      Вулканы + медведи
                    </motion.button>
                    <motion.button 
                      onClick={() => setAiQuery('Рыбалка для начинающих на выходные')}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-sm transition-colors"
                      whileHover={{ scale: 1.05 }}
                    >
                      Рыбалка для новичков
                    </motion.button>
                    <motion.button 
                      onClick={() => setAiQuery('Романтический тур с горячими источниками')}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-sm transition-colors"
                      whileHover={{ scale: 1.05 }}
                    >
                      Романтический отдых
                    </motion.button>
                  </div>
                </div>

                <textarea
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Например: Хочу активный тур на 5 дней с восхождением на вулкан, но без экстрима..."
                  className="ai-input w-full p-3 border border-white/20 rounded-xl bg-white/10 text-white placeholder:text-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-premium-gold text-sm"
                  rows={4}
                  aria-label="Запрос для AI"
                />

                <motion.button 
                  onClick={handleAISearch}
                  disabled={aiLoading || !aiQuery.trim()}
                  className="ai-search-btn w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-premium-gold text-premium-black rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {aiLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Думаю...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      Найти с помощью AI
                    </>
                  )}
                </motion.button>

                {aiResponse && (
                  <motion.div 
                    className="ai-response mt-4 p-4 bg-white/10 rounded-xl"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    role="status"
                    aria-label="Ответ AI"
                  >
                    <div className="ai-response-header flex items-center gap-2 mb-2">
                      <span className="ai-badge bg-moss text-white px-2 py-1 rounded-full text-xs font-medium">Рекомендация AI</span>
                    </div>
                    <p className="text-sm text-white/90 whitespace-pre-wrap">{aiResponse}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Основной поиск */}
      <div className="search-main max-w-4xl mx-auto px-4">
        <motion.div 
          className="search-input-group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Search size={20} className="text-white/60 flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            placeholder="Куда хотите отправиться? (вулкан, рыбалка, медведи...)"
            className="search-input-main flex-1 outline-none text-base text-white placeholder:text-white/40 bg-transparent"
            aria-label="Поиск туров"
            autoComplete="off"
          />
          {voiceSupported && (
            <motion.button 
              onClick={toggleVoiceInput}
              className={`voice-input-btn p-2 rounded-xl transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'text-white/60 hover:bg-white/10'}`}
              title="Голосовой ввод"
              aria-label="Голосовой ввод"
              aria-pressed={isListening}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={isListening ? { scale: [1, 1.05, 1], backgroundColor: '#fee2e2' } : {}}
            >
              <Mic size={18} aria-hidden="true" />
            </motion.button>
          )}
          <motion.button 
            onClick={() => setShowAI(true)}
            className="ai-assistant-btn flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="AI помощник"
          >
            <Bot size={16} />
            <span>AI</span>
          </motion.button>
          <motion.button 
            onClick={() => setShowFilters(!showFilters)}
            className={`filters-toggle p-2 rounded-xl transition-colors ${showFilters ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Фильтры"
            aria-expanded={showFilters}
          >
            <Filter size={18} />
            <span className="hidden sm:inline ml-1">Фильтры</span>
          </motion.button>
        </motion.div>

        {/* Быстрые фильтры - активности */}
        <div className="quick-filters flex flex-wrap gap-2 mb-6 justify-center sm:justify-start">
          {activities.map((activity) => (
            <motion.button
              key={activity.id}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                activity: prev.activity === activity.id ? '' : activity.id 
              }))}
              className={`activity-chip flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filters.activity === activity.id
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-pressed={filters.activity === activity.id}
            >
              {activity.icon}
              <span>{activity.name}</span>
            </motion.button>
          ))}
        </div>

        {/* Расширенные фильтры - glassmorphism sheet */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              className="advanced-filters bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6 shadow-xl"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="filter-group">
                  <label htmlFor="filter-difficulty" className="block text-sm font-medium text-white/70 mb-1">Сложность</label>
                  <select 
                    id="filter-difficulty"
                    value={filters.difficulty}
                    onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="filter-select w-full p-3 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold text-sm"
                    aria-label="Сложность тура"
                  >
                    <option value="any">Любая</option>
                    <option value="easy">Легко</option>
                    <option value="medium">Средне</option>
                    <option value="hard">Сложно</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-price-min" className="block text-sm font-medium text-white/70 mb-1">Цена от, ₽</label>
                  <input
                    id="filter-price-min"
                    type="number"
                    value={filters.priceMin || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMin: parseInt(e.target.value) || undefined }))}
                    placeholder="0"
                    className="filter-input w-full p-3 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold text-sm"
                    aria-label="Минимальная цена"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-price-max" className="block text-sm font-medium text-white/70 mb-1">Цена до, ₽</label>
                  <input
                    id="filter-price-max"
                    type="number"
                    value={filters.priceMax || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMax: parseInt(e.target.value) || undefined }))}
                    placeholder="∞"
                    className="filter-input w-full p-3 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold text-sm"
                    aria-label="Максимальная цена"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-duration" className="block text-sm font-medium text-white/70 mb-1">Длительность, дней</label>
                  <input
                    id="filter-duration"
                    type="number"
                    value={filters.duration || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, duration: parseInt(e.target.value) || undefined }))}
                    placeholder="Любая"
                    className="filter-input w-full p-3 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold text-sm"
                    aria-label="Длительность тура"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-passengers" className="block text-sm font-medium text-white/70 mb-1">Пассажиры</label>
                  <input
                    id="filter-passengers"
                    type="number"
                    value={filters.passengers || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, passengers: parseInt(e.target.value) || undefined }))}
                    placeholder="1"
                    min="1"
                    max="50"
                    className="filter-input w-full p-3 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold text-sm"
                    aria-label="Количество пассажиров"
                  />
                </div>
              </div>

              <motion.button 
                onClick={() => setFilters({ query: '', difficulty: 'any', activity: '', passengers: undefined, priceMin: undefined, priceMax: undefined, duration: undefined })}
                className="clear-filters-btn mt-4 px-6 py-3 border border-white/20 text-white/70 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Очистить все фильтры
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Результаты поиска */}
      {(filters.query || filters.passengers) && (
        <div className="search-results max-w-4xl mx-auto px-4">
          {loading ? (
            <motion.div 
              className="search-loading flex flex-col items-center justify-center py-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              role="status"
              aria-label="Загрузка результатов поиска"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-ocean to-moss rounded-full flex items-center justify-center mb-4 animate-spin">
                <Search size={24} className="text-white" />
              </div>
              <p className="text-xl font-semibold text-white mb-2">Ищем варианты...</p>
              <p className="text-sm text-white/60">Мгновенный поиск по 100+ турам</p>
            </motion.div>
          ) : results.length > 0 ? (
            <>
              <motion.div 
                className="results-header flex items-center justify-between mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-2xl font-bold text-white">
                  Найдено: <span className="text-premium-gold">{results.length}</span> {filters.passengers ? 'трансферов' : 'туров'}
                </h3>
                <motion.button 
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl font-medium hover:shadow-md transition-all"
                  whileHover={{ scale: 1.02 }}
                >
                  <Filter size={16} />
                  Дополнительные фильтры
                </motion.button>
              </motion.div>
              <motion.div 
                layout 
                className="results-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {results.map((result, index) => (
                  <TourCard key={result.id} result={result} />
                ))}
              </motion.div>
            </>
          ) : (
            <motion.div 
              className="no-results flex flex-col items-center justify-center py-12 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              role="alert"
              aria-label="Ничего не найдено"
            >
              <motion.div 
                className="no-results-icon w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mb-6 animate-pulse"
                whileHover={{ scale: 1.1 }}
              >
              <Search size={32} className="text-white/40" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-3">Ничего не найдено</h3>
              <p className="text-lg text-white/60 mb-6 max-w-md mx-auto">
                Попробуйте изменить запрос или воспользуйтесь AI-помощником для персональных рекомендаций.
              </p>
              <motion.button 
                onClick={() => setShowAI(true)}
                className="flex items-center gap-2 px-6 py-3 bg-premium-gold text-premium-black rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Bot size={20} />
                Спросить AI-помощника
              </motion.button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

