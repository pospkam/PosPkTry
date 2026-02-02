'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Fish, 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  Calendar,
  Check,
  AlertTriangle,
  Phone,
  MessageCircle,
  ChevronLeft,
  Share2,
  Heart
} from 'lucide-react';

// Демо данные
const tourData = {
  id: '1',
  name: 'Рыбалка на чавычу на реке Большая',
  description: `Незабываемая рыбалка на королевского лосося — чавычу. Река Большая славится крупными экземплярами весом до 30 кг.

Чавыча — самый крупный и желанный трофей для любого рыболова. Её называют "королём лососей" за размер, силу и вкусовые качества. Ход чавычи на Камчатке начинается в конце мая и продолжается до середины июля.

Наш лагерь расположен в самом уловистом месте реки Большая. За годы работы мы изучили все особенности поведения рыбы и знаем, где и когда она клюёт лучше всего.`,
  price: 85000,
  duration: 3,
  location: 'Река Большая, Усть-Большерецкий район',
  coordinates: { lat: 52.4, lng: 156.2 },
  fishTypes: ['Чавыча', 'Кижуч', 'Голец'],
  season: { start: '06', end: '07' },
  maxParticipants: 6,
  includes: [
    'Трансфер из Петропавловска-Камчатского (4 часа)',
    'Проживание в комфортабельном лагере',
    'Трёхразовое питание',
    'Рыболовное снаряжение (спиннинги, катушки, приманки)',
    'Услуги опытного гида-рыболова',
    'Лодка с мотором',
    'Вейдерсы и сапоги',
    'Первичная обработка улова',
  ],
  requirements: [
    'Лицензия на рыбалку (оформляем на месте, 500₽/день)',
    'Тёплая непромокаемая одежда',
    'Солнцезащитные очки',
    'Средства от комаров',
  ],
  images: [
    '/images/fishing/chavycha-1.jpg',
    '/images/fishing/chavycha-2.jpg',
    '/images/fishing/camp.jpg',
    '/images/fishing/river.jpg',
  ],
  difficulty: 'medium' as const,
  rating: 4.9,
  reviewsCount: 47,
  partner: {
    name: 'Камчатская Рыбалка',
    phone: '+7 (914) 781-55-55',
    whatsapp: '+79147815555',
    rating: 4.9,
    toursCount: 12,
  },
  schedule: [
    { day: 1, title: 'Прибытие и размещение', description: 'Встреча в Петропавловске, трансфер в лагерь, размещение, инструктаж, вечерняя рыбалка.' },
    { day: 2, title: 'Основной день рыбалки', description: 'Ранний выход на воду, рыбалка в лучших местах, обед на природе, продолжение рыбалки до вечера.' },
    { day: 3, title: 'Рыбалка и отъезд', description: 'Утренняя рыбалка, сборы, обработка улова, трансфер в Петропавловск.' },
  ],
};

export default function FishingTourDetailPage() {
  const params = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { text: 'Легкий', color: 'bg-green-500/20 text-green-400' };
      case 'medium': return { text: 'Средний', color: 'bg-yellow-500/20 text-yellow-400' };
      case 'hard': return { text: 'Сложный', color: 'bg-red-500/20 text-red-400' };
      default: return { text: difficulty, color: 'bg-gray-500/20 text-gray-400' };
    }
  };

  const difficulty = getDifficultyLabel(tourData.difficulty);

  return (
    <main className="min-h-screen bg-transparent text-white">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/tours/fishing"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Все рыболовные туры</span>
            </Link>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="space-y-4">
              <div className="aspect-video bg-white/10 rounded-2xl overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-900 to-cyan-800 flex items-center justify-center">
                  <Fish className="w-24 h-24 text-white/30" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-video bg-white/10 rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? 'border-premium-gold' : 'border-transparent'
                    }`}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-cyan-800/50 flex items-center justify-center">
                      <Fish className="w-8 h-8 text-white/30" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Badges */}
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${difficulty.color}`}>
                  {difficulty.text}
                </span>
                {tourData.fishTypes.map((fish, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">
                    🐟 {fish}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-black text-white mb-2">{tourData.name}</h1>
              <div className="flex items-center gap-4 text-white/70">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{tourData.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-premium-gold fill-premium-gold" />
                  <span className="text-white font-bold">{tourData.rating}</span>
                  <span>({tourData.reviewsCount} отзывов)</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">О туре</h2>
              <div className="text-white/80 whitespace-pre-line">
                {tourData.description}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Программа тура</h2>
              <div className="space-y-4">
                {tourData.schedule.map((day) => (
                  <div key={day.day} className="flex gap-4">
                    <div className="w-12 h-12 bg-premium-gold/20 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-premium-gold font-bold">{day.day}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{day.title}</h3>
                      <p className="text-white/70 text-sm">{day.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Includes */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Что включено</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tourData.includes.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Что взять с собой</h2>
              <div className="space-y-3">
                {tourData.requirements.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <span className="text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-black text-premium-gold">
                  {tourData.price.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-white/50">за человека</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Продолжительность
                  </span>
                  <span className="text-white font-medium">{tourData.duration} дня</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Группа
                  </span>
                  <span className="text-white font-medium">до {tourData.maxParticipants} чел.</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Сезон
                  </span>
                  <span className="text-white font-medium">Июнь — Июль</span>
                </div>
              </div>

              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full py-4 bg-premium-gold hover:bg-premium-gold/80 rounded-xl font-bold text-premium-black transition-colors mb-3"
              >
                Забронировать
              </button>

              <div className="flex gap-3">
                <a
                  href={`tel:${tourData.partner.phone}`}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Позвонить
                </a>
                <a
                  href={`https://wa.me/${tourData.partner.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-center font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Partner Card */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
              <h3 className="font-bold mb-4">Организатор</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-premium-gold/20 rounded-xl flex items-center justify-center">
                  <Fish className="w-8 h-8 text-premium-gold" />
                </div>
                <div>
                  <div className="font-bold text-white">{tourData.partner.name}</div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Star className="w-4 h-4 text-premium-gold fill-premium-gold" />
                    <span>{tourData.partner.rating}</span>
                    <span>•</span>
                    <span>{tourData.partner.toursCount} туров</span>
                  </div>
                </div>
              </div>
              <Link
                href="/partners/kamchatka-fishing"
                className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center font-medium transition-colors"
              >
                Все туры партнёра
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
