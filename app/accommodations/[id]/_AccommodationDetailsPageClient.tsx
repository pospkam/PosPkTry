'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { StayBookingForm } from '@/components/booking/StayBookingForm';
import { LoadingSpinner } from '@/components/admin/shared';
import { Star, MapPin, Users, Check } from 'lucide-react';

interface Accommodation {
  id: string;
  name: string;
  type: string;
  description: string;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  photos: string[];
  amenities: string[];
  address: string;
  coordinates: { lat: number; lng: number };
  maxGuests: number;
  roomsCount: number;
}

export default function AccommodationDetailsPageClient() {
  const params = useParams();
  const router = useRouter();
  const accommodationId = params.id as string;

  const [accommodation, setAccommodation] = useState<Accommodation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'rooms' | 'booking'>('overview');

  useEffect(() => {
    fetchAccommodationDetails();
  }, [accommodationId]);

  const fetchAccommodationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accommodations/${accommodationId}`);
      const result = await response.json();

      if (result.success) {
        setAccommodation(result.data);
      } else {
        setError('Размещение не найдено');
      }
    } catch (err) {
      console.error('Error fetching accommodation:', err);
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (bookingData: any) => {
    try {
      const response = await fetch(`/api/accommodations/${accommodationId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        return { id: result.data.bookingId };
      } else {
        throw new Error(result.error || 'Ошибка бронирования');
      }
    } catch (err) {
      console.error('Booking error:', err);
      throw err;
    }
  };

  const getTypeText = (type: string) => {
    const types: Record<string, string> = {
      hotel: 'Отель',
      hostel: 'Хостел',
      guesthouse: 'Гостевой дом',
      camping: 'Кемпинг',
      apartment: 'Апартаменты'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <LoadingSpinner message="Загрузка..." />
      </div>
    );
  }

  if (error || !accommodation) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Размещение не найдено'}</p>
          <button
            onClick={() => router.push('/hub/stay')}
            className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl font-semibold hover:bg-premium-gold/80 transition-colors"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-premium-black to-premium-black/80 border-b border-white/15">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-white/70 hover:text-white flex items-center gap-2"
          >
            ← Назад
          </button>
          <h1 className="text-4xl font-black text-white mb-2">{accommodation.name}</h1>
          <div className="flex items-center gap-4 text-white/70">
            <span><Star className="w-4 h-4" /> {accommodation.rating.toFixed(1)} ({accommodation.reviewCount} отзывов)</span>
            <span>• {getTypeText(accommodation.type)}</span>
            <span className="flex items-center gap-1">• <Users className="w-4 h-4" /> До {accommodation.maxGuests} гостей</span>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="col-span-4 md:col-span-2 row-span-2">
            <Image
              src={accommodation.photos[0] || '/placeholder-hotel.jpg'}
              alt={accommodation.name}
              fill
              className="object-cover rounded-2xl"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {accommodation.photos.slice(1, 5).map((photo, photoIndex) => (
            <div key={`photo-${photo}-${photoIndex}`} className="col-span-2 md:col-span-1">
              <Image
                src={photo}
                alt={`${accommodation.name} ${photoIndex + 2}`}
                fill
                className="object-cover rounded-xl"
                sizes="(max-width: 768px) 100vw, 25vw"
              />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/15">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`px-6 py-3 font-semibold transition-colors ${
              selectedTab === 'overview'
                ? 'text-white border-b-2 border-white/15'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setSelectedTab('rooms')}
            className={`px-6 py-3 font-semibold transition-colors ${
              selectedTab === 'rooms'
                ? 'text-white border-b-2 border-white/15'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Номера ({accommodation.roomsCount})
          </button>
          <button
            onClick={() => setSelectedTab('booking')}
            className={`px-6 py-3 font-semibold transition-colors ${
              selectedTab === 'booking'
                ? 'text-white border-b-2 border-white/15'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Бронирование
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Описание */}
                <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold mb-4">О размещении</h2>
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">
                    {accommodation.description}
                  </p>
                </div>

                {/* Удобства */}
                {accommodation.amenities && accommodation.amenities.length > 0 && (
                  <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold mb-4">Удобства</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {accommodation.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="text-white/80">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Расположение */}
                <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold mb-4">Расположение</h2>
                  <p className="text-white/80 mb-4"><MapPin className="w-4 h-4" /> {accommodation.address}</p>
                  <div className="bg-white/10 rounded-xl h-64 flex items-center justify-center">
                    <p className="text-white/50">Карта: {accommodation.coordinates.lat.toFixed(4)}, {accommodation.coordinates.lng.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'rooms' && (
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">Доступные номера</h2>
                <div className="space-y-4">
                  {[...Array(accommodation.roomsCount || 5)].map((_, roomIndex) => (
                    <div key={`room-${roomIndex}`} className="bg-white/15 border border-white/15 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Стандартный номер #{roomIndex + 1}</h3>
                          <p className="text-white/70 text-sm">До 2 гостей • 1 кровать</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            {accommodation.pricePerNight.toLocaleString('ru-RU')} ₽
                          </p>
                          <p className="text-xs text-white/50">за ночь</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'booking' && (
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">Забронировать номер</h2>
                <StayBookingForm
                  accommodationId={accommodationId}
                  accommodationName={accommodation.name}
                  pricePerNight={accommodation.pricePerNight}
                  onSubmit={handleBooking}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Цена и кнопка */}
            <div className="bg-gradient-to-br from-premium-gold/20 to-premium-gold/10 border border-white/15/30 rounded-2xl p-6 sticky top-6">
              <div className="text-center mb-4">
                <p className="text-white/70 text-sm mb-1">от</p>
                <p className="text-4xl font-black text-white">
                  {accommodation.pricePerNight.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-white/50 text-sm mt-1">за ночь</p>
              </div>

              <button
                onClick={() => setSelectedTab('booking')}
                className="w-full px-6 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors text-lg"
              >
                Забронировать
              </button>

              {/* Характеристики */}
              <div className="mt-6 space-y-3 pt-6 border-t border-white/15">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Тип</span>
                  <span className="text-white font-semibold">{getTypeText(accommodation.type)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Номеров</span>
                  <span className="text-white font-semibold">{accommodation.roomsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Вместимость</span>
                  <span className="text-white font-semibold">До {accommodation.maxGuests} гостей</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Рейтинг</span>
                  <span className="text-yellow-400 font-semibold">
                    <Star className="w-4 h-4" /> {accommodation.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Популярные удобства */}
            {accommodation.amenities && accommodation.amenities.length > 0 && (
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Популярные удобства</h3>
                <div className="space-y-2">
                  {accommodation.amenities.slice(0, 6).map((amenity, amenityIndex) => (
                    <div key={`amenity-${amenity}-${amenityIndex}`} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-white/80 text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

