'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface SearchFilters {
  query: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'any';
  activity?: string;
  duration?: number;
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
}

export function ModernTourSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    difficulty: 'any',
  });
  const [results, setResults] = useState<TourResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const recognitionRef = useRef<any>(null);

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

  // Живой поиск с debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (filters.query.length >= 2) {
      searchTimeout.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else {
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
      const params = new URLSearchParams({
        search: filters.query,
        ...(filters.difficulty !== 'any' && { difficulty: filters.difficulty }),
        ...(filters.activity && { activity: filters.activity }),
        ...(filters.priceMin && { priceMin: filters.priceMin.toString() }),
        ...(filters.priceMax && { priceMax: filters.priceMax.toString() }),
      });

      const response = await fetch(`/api/tours?${params}`);
      const data = await response.json();
      
      if (data.success && data.data?.tours) {
        setResults(data.data.tours);
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

  const activities = [
    { id: 'volcano', name: 'Вулканы', icon: '🌋' },
    { id: 'fishing', name: 'Рыбалка', icon: '🎣' },
    { id: 'hiking', name: 'Треккинг', icon: '🥾' },
    { id: 'wildlife', name: 'Медведи', icon: '🐻' },
    { id: 'geysers', name: 'Гейзеры', icon: '💨' },
    { id: 'hot-springs', name: 'Термалы', icon: '♨️' },
  ];

  return (
    <div className="modern-search-container">
      {/* AI Помощник */}
      {showAI && (
        <div className="ai-search-modal" onClick={() => setShowAI(false)}>
          <div className="ai-search-content" onClick={(e) => e.stopPropagation()}>
            <div className="ai-search-header">
              <div className="ai-search-title">
                <div className="ai-icon">🤖</div>
                <div>
                  <h3>AI Помощник поиска</h3>
                  <p>Опишите свой идеальный тур, я помогу подобрать!</p>
                </div>
              </div>
              <button onClick={() => setShowAI(false)} className="ai-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="ai-search-body">
              <div className="ai-examples">
                <p>Примеры запросов:</p>
                <div className="ai-example-chips">
                  <button onClick={() => setAiQuery('Хочу увидеть вулкан и медведей за 3 дня')}>
                    🌋 Вулканы + медведи
                  </button>
                  <button onClick={() => setAiQuery('Рыбалка для начинающих на выходные')}>
                    🎣 Рыбалка для новичков
                  </button>
                  <button onClick={() => setAiQuery('Романтический тур с горячими источниками')}>
                    ♨️ Романтический отдых
                  </button>
                </div>
              </div>

              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Например: Хочу активный тур на 5 дней с восхождением на вулкан, но без экстрима..."
                className="ai-input"
                rows={4}
              />

              <button 
                onClick={handleAISearch}
                disabled={aiLoading || !aiQuery.trim()}
                className="ai-search-btn"
              >
                {aiLoading ? (
                  <>
                    <span className="spinner"></span>
                    Думаю...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    Найти с помощью AI
                  </>
                )}
              </button>

              {aiResponse && (
                <div className="ai-response">
                  <div className="ai-response-header">
                    <span className="ai-badge">Рекомендация AI</span>
                  </div>
                  <p>{aiResponse}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Основной поиск */}
      <div className="search-main">
        <div className="search-input-group">
          <svg className="search-icon-main" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            placeholder="Куда хотите отправиться? (вулкан, рыбалка, медведи...)"
            className="search-input-main"
          />
          {voiceSupported && (
            <button 
              onClick={toggleVoiceInput}
              className={`voice-input-btn ${isListening ? 'listening' : ''}`}
              title="Голосовой ввод"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isListening ? (
                  <>
                    <rect x="9" y="2" width="6" height="20" rx="3"/>
                    <circle cx="12" cy="12" r="8" opacity="0.3" className="pulse-ring"/>
                  </>
                ) : (
                  <>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </>
                )}
              </svg>
            </button>
          )}
          <button 
            onClick={() => setShowAI(true)}
            className="ai-assistant-btn"
            title="AI помощник"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/>
              <path d="M12 6v12M6 12h12"/>
            </svg>
            <span>AI</span>
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`filters-toggle ${showFilters ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" x2="20" y1="6" y2="6"/>
              <line x1="4" x2="20" y1="12" y2="12"/>
              <line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
            Фильтры
          </button>
        </div>

        {/* Быстрые фильтры - активности */}
        <div className="quick-filters">
          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                activity: prev.activity === activity.id ? '' : activity.id 
              }))}
              className={`activity-chip ${filters.activity === activity.id ? 'active' : ''}`}
            >
              <span className="activity-icon">{activity.icon}</span>
              <span>{activity.name}</span>
            </button>
          ))}
        </div>

        {/* Расширенные фильтры */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-grid">
              <div className="filter-group">
                <label>Сложность</label>
                <select 
                  value={filters.difficulty}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="filter-select"
                >
                  <option value="any">Любая</option>
                  <option value="easy">Легко</option>
                  <option value="medium">Средне</option>
                  <option value="hard">Сложно</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Цена от</label>
                <input
                  type="number"
                  value={filters.priceMin || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMin: parseInt(e.target.value) || undefined }))}
                  placeholder="0"
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>Цена до</label>
                <input
                  type="number"
                  value={filters.priceMax || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMax: parseInt(e.target.value) || undefined }))}
                  placeholder="∞"
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>Длительность (дней)</label>
                <input
                  type="number"
                  value={filters.duration || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, duration: parseInt(e.target.value) || undefined }))}
                  placeholder="Любая"
                  className="filter-input"
                />
              </div>
            </div>

            <button 
              onClick={() => setFilters({ query: '', difficulty: 'any' })}
              className="clear-filters-btn"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* Результаты поиска */}
      {filters.query && (
        <div className="search-results">
          {loading ? (
            <div className="search-loading">
              <div className="spinner-large"></div>
              <p>Ищем туры...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="results-header">
                <h3>Найдено туров: {results.length}</h3>
              </div>
              <div className="results-grid">
                {results.map((tour) => (
                  <Link key={tour.id} href={`/tours/${tour.id}`} className="tour-result-card">
                    <div className="tour-result-image">
                      {tour.imageUrl ? (
                        <img src={tour.imageUrl} alt={tour.title} />
                      ) : (
                        <div className="tour-placeholder">🏔️</div>
                      )}
                      {tour.difficulty && (
                        <span className={`difficulty-badge ${tour.difficulty}`}>
                          {tour.difficulty === 'easy' && '🟢 Легко'}
                          {tour.difficulty === 'medium' && '🟡 Средне'}
                          {tour.difficulty === 'hard' && '🔴 Сложно'}
                        </span>
                      )}
                    </div>
                    <div className="tour-result-content">
                      <h4>{tour.title}</h4>
                      <p className="tour-description">{tour.description}</p>
                      <div className="tour-meta">
                        <span className="tour-duration">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {tour.duration}
                        </span>
                        {tour.rating && (
                          <span className="tour-rating">
                            ⭐ {tour.rating}
                            {tour.reviews && ` (${tour.reviews})`}
                          </span>
                        )}
                      </div>
                      <div className="tour-price">
                        от {tour.price?.toLocaleString()} ₽
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить запрос или воспользуйтесь AI-помощником</p>
              <button onClick={() => setShowAI(true)} className="try-ai-btn">
                Попробовать AI поиск
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
