'use client';

import React, { useState, useMemo } from 'react';
import { FishingToursGrid } from '@/components/fishing';
import { FISHING_TOURS, PARTNER_INFO, getToursByType } from '@/lib/partners/kamchatka-fishing/tours-data';
import { OrganizationJsonLd, BreadcrumbJsonLd } from '@/components/seo';
import { 
  Fish, 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Phone,
  MessageCircle,
  X,
  Calendar
} from 'lucide-react';

const fishTypes = ['Все', 'Чавыча', 'Нерка', 'Кижуч', 'Микижа', 'Хариус', 'Кунжа', 'Голец'];
const difficulties = [
  { value: 'all', label: 'Любая сложность' },
  { value: 'easy', label: 'Легкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
];
const tourTypes = [
  { value: 'all', label: 'Все туры' },
  { value: 'daily', label: 'Однодневные' },
  { value: 'multi', label: 'Многодневные' },
  { value: 'family', label: 'Семейные' },
];

export default function FishingToursPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFish, setSelectedFish] = useState('Все');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [showFilters, setShowFilters] = useState(false);

  const filteredTours = useMemo(() => {
    return FISHING_TOURS.filter(tour => {
      if (searchQuery && !tour.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedFish !== 'Все' && !tour.fishTypes.some(f => f.toLowerCase().includes(selectedFish.toLowerCase()))) {
        return false;
      }
      if (selectedDifficulty !== 'all' && tour.difficulty !== selectedDifficulty) {
        return false;
      }
      if (selectedType !== 'all' && tour.type !== selectedType) {
        return false;
      }
      if (tour.price < priceRange[0] || tour.price > priceRange[1]) {
        return false;
      }
      return true;
    });
  }, [searchQuery, selectedFish, selectedDifficulty, selectedType, priceRange]);

  const handleBook = (tourId: string) => {
    const tour = FISHING_TOURS.find(t => t.id === tourId);
    if (tour) {
      const message = encodeURIComponent(`Здравствуйте! Хочу забронировать тур "${tour.name}"`);
      window.open(`https://wa.me/${PARTNER_INFO.whatsapp}?text=${message}`, '_blank');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFish('Все');
    setSelectedDifficulty('all');
    setSelectedType('all');
    setPriceRange([0, 200000]);
  };

  const hasActiveFilters = searchQuery || selectedFish !== 'Все' || selectedDifficulty !== 'all' || selectedType !== 'all' || priceRange[0] > 0 || priceRange[1] < 200000;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kamchatour.ru';

  return (
    <main className="min-h-screen bg-transparent text-white">
      {/* SEO JSON-LD */}
      <OrganizationJsonLd
        name={PARTNER_INFO.name}
        url={PARTNER_INFO.website}
        description={PARTNER_INFO.description}
        phone={PARTNER_INFO.phones[0].phone}
        address={{
          addressLocality: 'Петропавловск-Камчатский',
          addressRegion: 'Камчатский край',
          addressCountry: 'RU',
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: baseUrl },
          { name: 'Туры', url: `${baseUrl}/tours` },
          { name: 'Рыбалка', url: `${baseUrl}/tours/fishing` },
        ]}
      />

      <div className="relative bg-gradient-to-b from-blue-900/50 to-transparent py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-premium-gold/20 rounded-2xl">
                <Fish className="w-10 h-10 text-premium-gold" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white">{PARTNER_INFO.name}</h1>
                <p className="text-white/70">{PARTNER_INFO.description}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <a
                href={`tel:${PARTNER_INFO.phones[0].phone}`}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                <span className="hidden sm:inline">{PARTNER_INFO.phones[0].phone}</span>
                <span className="sm:hidden">Позвонить</span>
              </a>
              <a
                href={`https://wa.me/${PARTNER_INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {PARTNER_INFO.features.map((feature) => (
              <div key={feature} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-sm text-white/80">{feature}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {tourTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${
                  selectedType === type.value
                    ? 'bg-premium-gold text-premium-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {type.label}
                <span className="ml-2 text-sm opacity-70">
                  ({type.value === 'all' ? FISHING_TOURS.length : getToursByType(type.value as 'daily' | 'multi' | 'family').length})
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                id="fishing-search"
                type="text"
                placeholder="Поиск по названию тура..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-premium-gold"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-4 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Фильтры
            </button>
          </div>

          {showFilters && (
            <div className="mt-6 p-6 bg-white/10 border border-white/20 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Фильтры</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-premium-gold hover:underline flex items-center gap-1">
                    <X className="w-4 h-4" />
                    Сбросить
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Вид рыбы</label>
                  <div className="flex flex-wrap gap-2">
                    {fishTypes.map((fish) => (
                      <button
                        key={fish}
                        onClick={() => setSelectedFish(fish)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedFish === fish
                            ? 'bg-premium-gold text-premium-black'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {fish}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="fishing-difficulty" className="block text-sm text-white/70 mb-2">Сложность</label>
                  <select
                    id="fishing-difficulty"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-premium-gold"
                  >
                    {difficulties.map((d) => (
                      <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="fishing-price" className="block text-sm text-white/70 mb-2">
                    Цена: до {priceRange[1].toLocaleString('ru-RU')} ₽
                  </label>
                  <input
                    id="fishing-price"
                    type="range"
                    min="0"
                    max="200000"
                    step="5000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-premium-gold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/70">
            Найдено туров: <span className="text-white font-bold">{filteredTours.length}</span>
          </p>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Камчатский край</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Круглый год</span>
            </div>
          </div>
        </div>

        <FishingToursGrid tours={filteredTours} onBook={handleBook} />

        <div className="mt-12 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border border-white/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Не нашли подходящий тур?</h2>
          <p className="text-white/70 mb-6">Свяжитесь с нами — подберём индивидуальную программу</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${PARTNER_INFO.phones[0].phone}`}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              {PARTNER_INFO.phones[0].name}: {PARTNER_INFO.phones[0].phone}
            </a>
            <a
              href={`tel:${PARTNER_INFO.phones[1].phone}`}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              {PARTNER_INFO.phones[1].name}: {PARTNER_INFO.phones[1].phone}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
