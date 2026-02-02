'use client';

import React, { useState, useEffect } from 'react';
import { StayDatePicker } from './calendars/StayDatePicker';
import { GuestSelector } from './ui/GuestSelector';
import { LoadingSpinner } from '@/components/admin/shared';
import { CloudPaymentsWidget } from '@/components/payments/CloudPaymentsWidget';

interface StayBookingFormProps {
  accommodationId: string;
  accommodationName: string;
  pricePerNight: number;
  onSubmit: (booking: BookingData) => Promise<{ id: string }>;
}

interface BookingData {
  accommodationId: string;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  totalPrice: number;
  specialRequirements?: string;
}

interface AvailabilityDate {
  date: string;
  available: boolean;
  price: number;
}

export function StayBookingForm({ 
  accommodationId, 
  accommodationName, 
  pricePerNight, 
  onSubmit 
}: StayBookingFormProps) {
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, [accommodationId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 месяцев вперёд

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      const response = await fetch(
        `/api/accommodations/${accommodationId}/availability?${params}`
      );
      
      if (!response.ok) {
        throw new Error('Ошибка при загрузке доступности');
      }
      
      const result = await response.json();

      if (result.success) {
        setAvailability(result.data.availability || []);
      } else {
        setError('Не удалось загрузить информацию о доступности');
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError('Ошибка при загрузке доступности');
    } finally {
      setLoading(false);
    }
  };

  const isDateAvailable = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const availDate = availability.find(a => a.date === dateStr);
    return availDate ? availDate.available : false;
  };

  const getPriceForDate = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    const availDate = availability.find(a => a.date === dateStr);
    return availDate ? availDate.price : pricePerNight;
  };

  const calculateNights = (): number => {
    if (!checkInDate || !checkOutDate) return 0;
    const time = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(time / (1000 * 3600 * 24));
  };

  const calculateTotalPrice = (): number => {
    if (!checkInDate || !checkOutDate) return 0;
    
    const nights = calculateNights();
    if (nights <= 0) return 0;

    // Суммируем стоимость по ночам
    let total = 0;
    const currentDate = new Date(checkInDate);
    
    for (let i = 0; i < nights; i++) {
      const nightPrice = getPriceForDate(currentDate);
      total += nightPrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Дети со скидкой 50%
    const childrenDiscount = 0.5;
    return Math.round(total * (adults + children * childrenDiscount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!checkInDate || !checkOutDate) {
      setError('Пожалуйста, выберите даты заезда и выезда');
      return;
    }

    if (checkOutDate <= checkInDate) {
      setError('Дата выезда должна быть позже даты заезда');
      return;
    }

    const totalGuests = adults + children;
    if (totalGuests === 0) {
      setError('Пожалуйста, добавьте хотя бы одного гостя');
      return;
    }

    // Проверяем доступность всех ночей
    const currentDate = new Date(checkInDate);
    while (currentDate < checkOutDate) {
      if (!isDateAvailable(currentDate)) {
        const dateStr = currentDate.toLocaleDateString('ru-RU');
        setError(`Номер недоступен на ${dateStr}`);
        return;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setSubmitting(true);
    try {
      const booking = await onSubmit({
        accommodationId,
        checkInDate,
        checkOutDate,
        adults,
        children,
        totalPrice: calculateTotalPrice(),
        specialRequirements: specialRequirements.trim() || undefined
      });
      
      // После создания бронирования показываем оплату
      setBookingId(booking.id);
      setPaymentId(booking.id);
      setShowPayment(true);
    } catch (err) {
      console.error('Error submitting booking:', err);
      setError('Ошибка при создании бронирования');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (transactionId: number) => {
    console.log('Payment successful:', transactionId);
    setError(null);
    // TODO: Редирект на страницу подтверждения или показать сообщение об успехе
  };

  const handlePaymentFail = (reason: string) => {
    console.error('Payment failed:', reason);
    setError(`Ошибка оплаты: ${reason}`);
    setShowPayment(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner message="Загрузка доступности номеров..." />
      </div>
    );
  }

  const nights = calculateNights();
  const totalPrice = calculateTotalPrice();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Accommodation Info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-2xl font-bold text-white mb-2">{accommodationName}</h3>
        <p className="text-premium-gold text-xl font-semibold">
          {pricePerNight.toLocaleString('ru-RU')} ₽ за ночь
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Date Selection */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Даты проживания</h4>
        <StayDatePicker
          accommodationId={accommodationId}
          pricePerNight={pricePerNight}
          onDatesChange={(checkIn, checkOut, pricing) => {
            setCheckInDate(checkIn);
            setCheckOutDate(checkOut);
          }}
          initialCheckIn={checkInDate}
          initialCheckOut={checkOutDate}
          enableAvailabilityCheck={true}
        />
        
        {checkInDate && checkOutDate && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400">
              [] Заезд: {checkInDate.toLocaleDateString('ru-RU')}
            </p>
            <p className="text-green-400">
              [] Выезд: {checkOutDate.toLocaleDateString('ru-RU')}
            </p>
            <p className="text-white/70 text-sm mt-2">
              Количество ночей: {nights}
            </p>
          </div>
        )}
      </div>

      {/* Guests Selection */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Количество гостей</h4>
        <GuestSelector
          maxGuests={20}
          initialAdults={adults}
          initialChildren={children}
          onChange={(newAdults, newChildren) => {
            setAdults(newAdults);
            setChildren(newChildren);
          }}
        />
      </div>

      {/* Special Requirements */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Особые пожелания</h4>
        <textarea
          value={specialRequirements}
          onChange={(e) => setSpecialRequirements(e.target.value)}
          placeholder="Например: высокий этаж, вид на море, гипоаллергенные подушки..."
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
        />
      </div>

      {/* Price Summary */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-2xl p-6">
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Ночей:</span>
            <span className="text-white font-semibold">{nights}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Цена за ночь:</span>
            <span className="text-white font-semibold">
              {pricePerNight.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Взрослые ({adults}):</span>
            <span className="text-white font-semibold">
              {nights > 0 ? (adults * pricePerNight * nights).toLocaleString('ru-RU') : 0} ₽
            </span>
          </div>
          {children > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-white/70">Дети ({children}, скидка 50%):</span>
              <span className="text-white font-semibold">
                {nights > 0 ? (children * pricePerNight * nights * 0.5).toLocaleString('ru-RU') : 0} ₽
              </span>
            </div>
          )}
        </div>
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-white">Итого:</span>
            <span className="text-2xl font-black text-premium-gold">
              {totalPrice.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Payment or Submit */}
      {showPayment && bookingId && paymentId ? (
        <div className="space-y-4">
          <CloudPaymentsWidget
            amount={totalPrice}
            currency="RUB"
            description={`Бронирование: ${accommodationName}`}
            invoiceId={paymentId}
            accountId="user-id" // TODO: Получить из сессии
            email="user@example.com" // TODO: Получить из сессии
            onSuccess={handlePaymentSuccess}
            onFail={handlePaymentFail}
            buttonText={`Оплатить ${totalPrice.toLocaleString('ru-RU')} ₽`}
          />
          <button
            type="button"
            onClick={() => setShowPayment(false)}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Вернуться к бронированию
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!checkInDate || !checkOutDate || submitting}
          className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2"> </span>
              Оформление...
            </span>
          ) : (
            'Забронировать номер'
          )}
        </button>
      )}
    </form>
  );
}
