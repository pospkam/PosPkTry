'use client';

import { useState, useRef, useEffect } from 'react';
// Простые SVG иконки вместо lucide-react
const Search = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const Mic = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
);
const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M9.5 2l1.5 5.5L16 9l-5 1.5L9.5 16 8 10.5 3 9l5.5-1.5L9.5 2zm5 8l1 3.5 3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1 1-3.5z" /></svg>
);
const TrendingUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);
const Map = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
);
const DollarSign = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const Clock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export default function AIKamSmartSearch() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const trendingQueries = [
    { icon: TrendingUp, text: 'Восхождение на Авачинский вулкан', category: 'Популярное' },
    { icon: Map, text: 'Долина Гейзеров', category: 'Достопримечательности' },
    { icon: DollarSign, text: 'Туры до 50000₽', category: 'Бюджет' },
    { icon: Clock, text: 'Однодневные маршруты', category: 'Короткие туры' },
  ];

  // Симуляция AI подсказок
  useEffect(() => {
    if (query.length > 2) {
      // В реальности здесь запрос к AI API
      const mockSuggestions = [
        `${query} для начинающих`,
        `${query} зимой`,
        `${query} с гидом`,
        `${query} цена`,
      ];
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [query]);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    // Отправка запроса к AI Kam для умного поиска
    try {
      const response = await fetch('/api/ai/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const results = await response.json();
      
      // Редирект на страницу результатов
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}&ai=true`;
    } catch (error) {
      console.error('AI Search error:', error);
      // Fallback к обычному поиску
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Голосовой ввод не поддерживается вашим браузером');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(transcript);
    };

    recognition.start();
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Основной поиск */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/30 shadow-2xl">
          {/* Иконка AI */}
          <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />

          {/* Поле ввода */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Спросите AI Kam о турах на Камчатке..."
            className="flex-1 bg-transparent text-white text-lg placeholder-white/70 outline-none"
          />

          {/* Кнопка голосового ввода */}
          <button
            onClick={startVoiceInput}
            className={`p-2 rounded-full transition-all ${
              isListening
                ? 'bg-red-500 animate-pulse'
                : 'bg-white/20 hover:bg-white/30'
            }`}
            title="Голосовой поиск"
          >
            <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-white/80'}`} />
          </button>

          {/* Кнопка поиска */}
          <button
            onClick={() => handleSearch()}
            className="bg-white/30 hover:bg-white/40 px-6 py-2 rounded-xl transition-all font-bold text-white"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* AI подсказки */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 overflow-hidden shadow-2xl z-50">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion);
                  setShowSuggestions(false);
                  handleSearch(suggestion);
                }}
                className="w-full px-6 py-3 text-left text-white hover:bg-white/20 transition-all flex items-center gap-3"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Популярные запросы */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <span className="text-white/70 text-sm">Популярное:</span>
        {trendingQueries.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => {
                setQuery(item.text);
                handleSearch(item.text);
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-4 py-2 rounded-full text-white text-sm transition-all border border-white/20"
            >
              <Icon className="w-4 h-4" />
              {item.text}
            </button>
          );
        })}
      </div>

      {/* Бейдж AI Powered */}
      <div className="mt-4 flex justify-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="text-white/80 text-sm font-medium">
            Powered by AI Kam
          </span>
        </div>
      </div>
    </div>
  );
}
