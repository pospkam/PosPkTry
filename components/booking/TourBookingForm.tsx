'use client';

import React, { useState, useEffect } from 'react';
import { TourDatePicker } from './calendars/TourDatePicker';
import { GuestSelector } from './ui/GuestSelector';
import { LoadingSpinner } from '@/components/admin/shared';
import { CloudPaymentsWidget } from '@/components/payments/CloudPaymentsWidget';

interface TourBookingFormProps {
  tourId: string;
  tourName: string;
  price: number;
  tourType?: 'group' | 'individual'; // Тип тура
  duration?: number; // Длительность в днях
  onSubmit: (booking: BookingData) => Promise<void>;
}

interface BookingData {
  tourId: string;
  date: Date;
  adults: number;
  children: number;
  totalPrice: number;
  specialRequirements?: string;
}

interface AvailabilityDate {
  date: string;
  available: boolean;
  spotsLeft: number;
  price: number;
  reason?: string;
}

export function TourBookingForm({ 
  tourId, 
  tourName, 
  price, 
  tourType = 'group',
  duration = 1,
  onSubmit 
}: TourBookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, [tourId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // 3 месяца вперёд

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      const response = await fetch(`/api/tours/${tourId}/availability?${params}`);
      const result = await response.json();

      if (result.success) {
        setAvailability(result.data.availability);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDateAvailable = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const availDate = availability.find(a => a.date === dateStr);
    return availDate ? availDate.available : false;
  };

  const getSpotsLeft = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    const availDate = availability.find(a => a.date === dateStr);
    return availDate ? availDate.spotsLeft : 0;
  };

  const calculateTotalPrice = (): number => {
    if (!selectedDate) return 0;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const availDate = availability.find(a => a.date === dateStr);
    const datePrice = availDate ? availDate.price : price;
    
    // Дети со скидкой 50%
    return (adults * datePrice) + (children * datePrice * 0.5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      alert('Пожалуйста, выберите дату');
      return;
    }

    const totalGuests = adults + children;
    const spotsLeft = getSpotsLeft(selectedDate);

    if (totalGuests > spotsLeft) {
      alert(`Недостаточно мест. Доступно: ${spotsLeft}`);
      return;
    }

    setSubmitting(true);
    try {
      const booking = await onSubmit({
        tourId,
        date: selectedDate,
        adults,
        children,
        totalPrice: calculateTotalPrice(),
        specialRequirements: specialRequirements.trim() || undefined
      });
      
      // После создания бронирования показываем оплату
      setBookingId(booking.id);
      setShowPayment(true);
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Ошибка при создании бронирования');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (transactionId: number) => {
    console.log('Payment successful:', transactionId);
    alert('Оплата прошла успешно! Бронирование подтверждено.');
    // TODO: Редирект на страницу подтверждения
  };

  const handlePaymentFail = (reason: string) => {
    console.error('Payment failed:', reason);
    alert(`Ошибка оплаты: ${reason}`);
    setShowPayment(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner message="Загрузка доступных дат..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tour Info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-2xl font-bold text-white mb-2">{tourName}</h3>
        <p className="text-premium-gold text-xl font-semibold">
          от {price.toLocaleString('ru-RU')} ₽
        </p>
      </div>

      {/* Date Selection */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Выберите дату</h4>
        <TourDatePicker
          tourId={tourId}
          tourType={tourType}
          duration={duration}
          onDateSelect={(date, timeSlot) => {
            setSelectedDate(date);
          }}
          initialDate={selectedDate}
        />
        {selectedDate && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400">
              [] Выбрана дата: {selectedDate.toLocaleDateString('ru-RU')}
            </p>
            <p className="text-white/70 text-sm mt-1">
              Свободных мест: {getSpotsLeft(selectedDate)}
            </p>
          </div>
        )}
      </div>

      {/* Guests Selection */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Количество гостей</h4>
        <GuestSelector
          maxGuests={selectedDate ? getSpotsLeft(selectedDate) : 10}
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
          placeholder="Например: диетические требования, особые потребности..."
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
        />
      </div>

      {/* Price Summary */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-white/70">Взрослые ({adults})</span>
          <span className="text-white font-semibold">
            {(adults * price).toLocaleString('ru-RU')} ₽
          </span>
        </div>
        {children > 0 && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/70">Дети ({children})</span>
            <span className="text-white font-semibold">
              {(children * price * 0.5).toLocaleString('ru-RU')} ₽
            </span>
          </div>
        )}
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-white">Итого:</span>
            <span className="text-2xl font-black text-premium-gold">
              {calculateTotalPrice().toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Payment or Submit */}
      {showPayment && bookingId ? (
        <div className="space-y-4">
          <CloudPaymentsWidget
            amount={calculateTotalPrice()}
            currency="RUB"
            description={`Бронирование тура: ${tourName}`}
            invoiceId={paymentId || bookingId}
            accountId="user-id" // TODO: Получить из сессии
            email="user@example.com" // TODO: Получить из сессии
            onSuccess={handlePaymentSuccess}
            onFail={handlePaymentFail}
            buttonText={`Оплатить ${calculateTotalPrice().toLocaleString('ru-RU')} ₽`}
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
          disabled={!selectedDate || submitting}
          className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2"> </span>
              Оформление...
            </span>
          ) : (
            'Забронировать тур'
          )}
        </button>
      )}
    </form>
  );
}

