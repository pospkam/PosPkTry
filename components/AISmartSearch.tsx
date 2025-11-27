'use client';

import { useState } from 'react';
import { Sparkles, Flame, Fish, Waves, TreePine, Droplet, Mountain } from 'lucide-react';

export default function AISmartSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const searchCategories = [
    { label: 'Вулканы', icon: Flame },
    { label: 'Рыбалка', icon: Fish },
    { label: 'Сёрфинг', icon: Waves },
    { label: 'Природа', icon: TreePine },
    { label: 'Источники', icon: Droplet },
    { label: 'Восхождения', icon: Mountain }
  ];

  const handleAISearch = async () => {
    if (!searchQuery.trim() || isSearching) return;
    
    setIsSearching(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Найди туры на Камчатке по запросу: ${searchQuery}`,
          sessionId: `search_${Date.now()}`
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('AI Search results:', data);
        // TODO: Обработать результаты поиска
      }
    } catch (error) {
      console.error('AI Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mb-6">
      <div className="relative group">
        {/* Sparkles icon with pulse */}
        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-300/90 animate-pulse" />
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
          placeholder="Спроси AI.Kam: 'Найди восхождение на вулкан для новичков'..."
          className="w-full px-5 py-3 pl-12 pr-24 bg-white/50 backdrop-blur-3xl border-2 border-white/50 rounded-2xl text-gray-800 placeholder-gray-500/70 font-light text-sm focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all shadow-2xl"
        />
        
        {/* AI Button */}
        <button 
          onClick={handleAISearch}
          disabled={isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSearching ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          AI
        </button>
      </div>
      
      {/* Quick Categories */}
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {searchCategories.map((cat, i) => (
          <button 
            key={i}
            onClick={() => {
              setSearchQuery(cat.label);
              handleAISearch();
            }}
            className="px-3 py-1 bg-white/30 backdrop-blur-xl border border-white/40 rounded-full text-white text-xs font-light hover:bg-white/50 transition-all flex items-center gap-1.5 shadow-lg"
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
