'use client';

import React, { useState, useEffect, useRef } from 'react';
import './PremiumSearchBar.css';
import { SearchFilters } from './SearchFilters';
import {
  SearchIcon,
  MicrophoneIcon,
  CameraIcon,
  MapIcon,
  CloseIcon,
  ClockIcon,
  FireIcon,
  LightbulbIcon,
  FolderIcon,
  MountainIcon,
  PawIcon,
  FishIcon,
  DropletIcon,
  HelicopterIcon,
  ZapIcon,
  HotelIcon,
  CarIcon,
  StarIcon,
  TrendingIcon,
  TargetIcon,
  WavesIcon,
  SnowflakeIcon,
  BinocularsIcon,
  WhaleIcon,
  TentIcon,
  TreesIcon,
  CompassIcon,
  BackpackIcon,
  SunsetIcon,
  BikeIcon,
  SkiIcon,
  AnchorIcon,
  ParachuteIcon,
  BookIcon,
  GlobeIcon
} from './SearchIcons';

interface SearchSuggestion {
  id: string;
  type: 'history' | 'popular' | 'suggestion' | 'location';
  text: string;
  icon: string;
  meta?: string; // rating, price, distance
}

interface PremiumSearchBarProps {
  onSearch: (query: string, filters?: any) => void;
  placeholder?: string;
}

export function PremiumSearchBar({ onSearch, placeholder = 'Что ищете?' }: PremiumSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Popular tags - РАСШИРЕННЫЙ СПИСОК
  const quickTags = [
    // Топ активности
    { icon: MountainIcon, label: 'Вулканы', value: 'восхождение на вулканы' },
    { icon: PawIcon, label: 'Медведи', value: 'наблюдение за медведями' },
    { icon: DropletIcon, label: 'Термы', value: 'термальные источники' },
    { icon: HelicopterIcon, label: 'Вертолёт', value: 'вертолётные туры' },
    { icon: FishIcon, label: 'Рыбалка', value: 'рыбалка камчатка' },
    
    // Вода
    { icon: WavesIcon, label: 'Сёрфинг', value: 'серфинг камчатка' },
    { icon: AnchorIcon, label: 'Морские туры', value: 'морские прогулки' },
    { icon: WhaleIcon, label: 'Киты', value: 'наблюдение за китами' },
    
    // Зима
    { icon: SnowflakeIcon, label: 'Сноуборд', value: 'сноуборд горные лыжи' },
    { icon: SkiIcon, label: 'Хели-ски', value: 'хели-ски фрирайд' },
    { icon: BikeIcon, label: 'Снегоходы', value: 'снегоходные туры' },
    
    // Экстрим
    { icon: ZapIcon, label: 'Экстрим', value: 'экстремальные туры' },
    { icon: ParachuteIcon, label: 'Параглайдинг', value: 'параглайдинг' },
    { icon: CompassIcon, label: 'Треккинг', value: 'треккинг походы' },
    
    // Туризм
    { icon: TentIcon, label: 'Кемпинг', value: 'кемпинг палатки' },
    { icon: BackpackIcon, label: 'Туры', value: 'многодневные туры' },
    { icon: BinocularsIcon, label: 'Фотосафари', value: 'фотосафари' },
    
    // Культура
    { icon: BookIcon, label: 'Экскурсии', value: 'экскурсии культура' },
    { icon: SunsetIcon, label: 'Фотографии', value: 'фототуры' },
    { icon: TreesIcon, label: 'Природа', value: 'природные парки' },
    
    // Сервисы
    { icon: HotelIcon, label: 'Отели', value: 'отели размещение' },
    { icon: CarIcon, label: 'Трансфер', value: 'трансфер аренда авто' },
    { icon: GlobeIcon, label: 'Гиды', value: 'гиды проводники' },
  ];

  // Categories - РАСШИРЕННЫЕ
  const categories = [
    { icon: MountainIcon, label: 'Вулканы и горы', count: 127 },
    { icon: PawIcon, label: 'Дикая природа', count: 89 },
    { icon: WavesIcon, label: 'Водные туры', count: 156 },
    { icon: SnowflakeIcon, label: 'Зимние виды', count: 94 },
    { icon: ZapIcon, label: 'Экстрим', count: 67 },
    { icon: HelicopterIcon, label: 'Вертолёты', count: 45 },
    { icon: DropletIcon, label: 'Термальные', count: 78 },
    { icon: FishIcon, label: 'Рыбалка', count: 112 },
    { icon: TentIcon, label: 'Кемпинг', count: 56 },
    { icon: CompassIcon, label: 'Треккинг', count: 134 },
    { icon: BinocularsIcon, label: 'Фотосафари', count: 43 },
    { icon: BookIcon, label: 'Экскурсии', count: 91 },
    { icon: HotelIcon, label: 'Размещение', count: 234 },
    { icon: CarIcon, label: 'Трансфер', count: 178 },
    { icon: BackpackIcon, label: 'Туры', count: 312 },
    { icon: GlobeIcon, label: 'Гиды', count: 156 },
  ];

  // Initialize voice recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ru-RU';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        handleSearch(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Load search history
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }

    // Auto-scroll carousel every 3 seconds
    const startAutoScroll = () => {
      autoScrollTimerRef.current = setInterval(() => {
        if (!isAutoScrollPaused && !isDragging) {
          setActiveTagIndex((prev) => (prev + 1) % quickTags.length);
        }
      }, 3000);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, [isAutoScrollPaused, isDragging, quickTags.length]);

  // Auto-suggestions
  useEffect(() => {
    if (query.length > 1) {
      // Simulate API call with mock data
      const mockSuggestions: SearchSuggestion[] = [
        { id: '1', type: 'suggestion', text: 'Авачинский вулкан', icon: 'mountain', meta: '★ 4.9 · 8500₽ · 30 км' },
        { id: '2', type: 'suggestion', text: 'Долина гейзеров', icon: 'helicopter', meta: '★ 5.0 · 35000₽ · 200 км' },
        { id: '3', type: 'suggestion', text: 'Курильское озеро медведи', icon: 'paw', meta: '★ 4.8 · 45000₽ · 150 км' },
        { id: '4', type: 'location', text: 'Термальные источники', icon: 'droplet', meta: '★ 4.7 · 5000₽ · 12 км' },
        { id: '5', type: 'suggestion', text: 'Рыбалка на реке', icon: 'fish', meta: '★ 4.6 · 12000₽ · 50 км' },
      ];
      
      setSuggestions(mockSuggestions.filter(s => 
        s.text.toLowerCase().includes(query.toLowerCase())
      ));
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      // Save to history
      const newHistory = [finalQuery, ...searchHistory.filter(h => h !== finalQuery)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      
      onSearch(finalQuery);
      setIsFocused(false);
    }
  };

  const handleVoiceSearch = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  const handleTagClick = (value: string) => {
    setQuery(value);
    handleSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handlePhotoSearch = () => {
    alert('Поиск по фото будет доступен в следующей версии!');
  };

  const handleMapView = () => {
    alert('Поиск на карте будет доступен в следующей версии!');
  };

  const handleFiltersApply = (filters: any) => {
    console.log('Applied filters:', filters);
    onSearch(query, filters);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 300;
    const newOffset = direction === 'left' 
      ? Math.max(0, carouselOffset - scrollAmount)
      : carouselOffset + scrollAmount;
    
    setCarouselOffset(newOffset);
    carouselRef.current.scrollTo({
      left: newOffset,
      behavior: 'smooth'
    });
  };

  // Drag to scroll functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // Center and highlight tag on click
  const handleTagClickWithCenter = (value: string, index: number) => {
    setActiveTagIndex(index);
    pauseAutoScroll();
    centerTag(index);
    handleTagClick(value);
  };

  // Center specific tag in carousel
  const centerTag = (index: number) => {
    if (!carouselRef.current) return;
    const carousel = carouselRef.current;
    const tagElements = carousel.children;
    if (tagElements[index]) {
      const tagElement = tagElements[index] as HTMLElement;
      const tagCenter = tagElement.offsetLeft + tagElement.offsetWidth / 2;
      const carouselCenter = carousel.offsetWidth / 2;
      const scrollPosition = tagCenter - carouselCenter;
      
      carousel.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  // Pause auto-scroll on user interaction
  const pauseAutoScroll = () => {
    setIsAutoScrollPaused(true);
    
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    
    // Resume after 5 seconds
    pauseTimerRef.current = setTimeout(() => {
      setIsAutoScrollPaused(false);
    }, 5000);
  };

  // Auto-center active tag
  useEffect(() => {
    if (!isAutoScrollPaused) {
      centerTag(activeTagIndex);
    }
  }, [activeTagIndex]);

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      mountain: MountainIcon,
      helicopter: HelicopterIcon,
      paw: PawIcon,
      droplet: DropletIcon,
      fish: FishIcon,
      clock: ClockIcon,
      trending: TrendingIcon,
      target: TargetIcon,
      waves: WavesIcon,
      snowflake: SnowflakeIcon,
      whale: WhaleIcon,
      tent: TentIcon,
      trees: TreesIcon,
      compass: CompassIcon,
      backpack: BackpackIcon,
      sunset: SunsetIcon,
      bike: BikeIcon,
      ski: SkiIcon,
      anchor: AnchorIcon,
      parachute: ParachuteIcon,
      book: BookIcon,
      globe: GlobeIcon,
      binoculars: BinocularsIcon
    };
    return icons[iconName] || TargetIcon;
  };

  return (
    <div className="premium-search-container">
      {/* Main Search Bar */}
      <div className={`premium-search-bar ${isFocused ? 'focused' : ''}`}>
        <div className="search-icon">
          <SearchIcon size={24} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          className="search-input-premium"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />

        {query && (
          <button className="clear-btn" onClick={handleClear} aria-label="Очистить">
            <CloseIcon size={16} />
          </button>
        )}

        <div className="search-actions">
          <button 
            className={`action-btn voice-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceSearch}
            aria-label="Голосовой поиск"
            title="Голосовой поиск"
          >
            <MicrophoneIcon size={20} />
          </button>
          
          <button 
            className="action-btn photo-btn"
            onClick={handlePhotoSearch}
            aria-label="Поиск по фото"
            title="Поиск по фото"
          >
            <CameraIcon size={20} />
          </button>
          
          <button 
            className="action-btn map-btn"
            onClick={handleMapView}
            aria-label="Показать на карте"
            title="Показать на карте"
          >
            <MapIcon size={20} />
          </button>

          <button 
            className="action-btn filter-btn-main"
            onClick={() => setShowFilters(true)}
            aria-label="Фильтры"
            title="Фильтры"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <SearchFilters 
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleFiltersApply}
      />

      {/* Quick Tags Carousel */}
      {!isFocused && (
        <div className="quick-tags">
          <div className="tags-header">
            <div className="tags-label">
              <FireIcon size={12} className="inline-icon" />
              <span>ПОПУЛЯРНЫЕ</span>
            </div>
            <div className="carousel-controls">
              <button 
                className="carousel-btn-small"
                onClick={() => scrollCarousel('left')}
                aria-label="Влево"
              >
                &lsaquo;
              </button>
              <button 
                className="carousel-btn-small"
                onClick={() => scrollCarousel('right')}
                aria-label="Вправо"
              >
                &rsaquo;
              </button>
            </div>
          </div>
          <div 
            className="tags-carousel" 
            ref={carouselRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseEnter={pauseAutoScroll}
          >
            {quickTags.map((tag, idx) => {
              const IconComponent = tag.icon;
              const isActive = idx === activeTagIndex;
              return (
                <button
                  key={idx}
                  className={`quick-tag-compact ${isActive ? 'active' : ''}`}
                  onClick={() => handleTagClickWithCenter(tag.value, idx)}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="tag-icon-compact">
                    <IconComponent size={20} />
                  </span>
                  <span className="tag-label-compact">{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */
      {isFocused && (
        <div className="search-dropdown">
          {/* History */}
          {searchHistory.length > 0 && query.length === 0 && (
            <div className="dropdown-section">
              <div className="section-header">
                <ClockIcon size={14} className="inline-icon" />
                <span>НЕДАВНИЕ ЗАПРОСЫ</span>
              </div>
              {searchHistory.slice(0, 5).map((item, idx) => (
                <button
                  key={idx}
                  className="suggestion-item history-item"
                  onClick={() => handleTagClick(item)}
                >
                  <span className="suggestion-icon">
                    <ClockIcon size={20} />
                  </span>
                  <span className="suggestion-text">{item}</span>
                  <button 
                    className="remove-history"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newHistory = searchHistory.filter((_, i) => i !== idx);
                      setSearchHistory(newHistory);
                      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
                    }}
                  >
                    <CloseIcon size={12} />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="dropdown-section">
              <div className="section-header">
                <LightbulbIcon size={14} className="inline-icon" />
                <span>ПРЕДЛОЖЕНИЯ</span>
              </div>
              {suggestions.map((item) => {
                const IconComponent = getIconComponent(item.icon);
                return (
                  <button
                    key={item.id}
                    className="suggestion-item"
                    onClick={() => handleTagClick(item.text)}
                  >
                    <span className="suggestion-icon">
                      <IconComponent size={20} />
                    </span>
                    <div className="suggestion-content">
                      <span className="suggestion-text">{item.text}</span>
                      {item.meta && (
                        <span className="suggestion-meta">
                          <StarIcon size={12} className="inline-icon" />
                          {item.meta}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Categories */}
          {query.length === 0 && (
            <div className="dropdown-section">
              <div className="section-header">
                <FolderIcon size={14} className="inline-icon" />
                <span>КАТЕГОРИИ</span>
              </div>
              <div className="categories-grid">
                {categories.map((cat, idx) => {
                  const IconComponent = cat.icon;
                  return (
                    <button
                      key={idx}
                      className="category-card"
                      onClick={() => handleTagClick(cat.label.toLowerCase())}
                    >
                      <span className="category-icon">
                        <IconComponent size={24} />
                      </span>
                      <div className="category-info">
                        <span className="category-label">{cat.label}</span>
                        <span className="category-count">{cat.count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {query.length > 1 && suggestions.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">
                <SearchIcon size={48} />
              </div>
              <div className="no-results-text">Ничего не найдено</div>
              <div className="no-results-hint">Попробуйте другой запрос</div>
            </div>
          )}
        </div>
      )}

      {/* Voice Listening Indicator */}
      {isListening && (
        <div className="voice-indicator">
          <div className="voice-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="voice-text">Слушаю...</div>
        </div>
      )}
    </div>
  );
}
