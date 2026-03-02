'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Backpack } from 'lucide-react';

interface GearItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  pricePerDay: number;
  pricePerWeek?: number;
  imageUrl?: string;
  availableQuantity: number;
  rating?: number;
  condition: 'new' | 'good' | 'fair';
  size?: string;
}

interface GearBookingFormProps {
  gear: GearItem;
  onBookingComplete: () => void;
  onCancel: () => void;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  startDate: string;
  endDate: string;
  quantity: number;
  insurance: boolean;
  comments?: string;
}

export function GearBookingForm({ gear, onBookingComplete, onCancel }: GearBookingFormProps) {
  const [form, setForm] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quantity: 1,
    insurance: false,
    comments: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Расчет стоимости
  const calculateDays = () => {
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const days = calculateDays();
  const basePrice = days >= 7 && gear.pricePerWeek
    ? gear.pricePerWeek
    : gear.pricePerDay * days;

  const insuranceCost = form.insurance ? Math.round(basePrice * 0.1) : 0;
  const totalPrice = (basePrice + insuranceCost) * form.quantity;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Введите имя';
    if (!form.email.trim()) newErrors.email = 'Введите email';
    if (!form.phone.trim()) newErrors.phone = 'Введите телефон';
    if (!form.startDate) newErrors.startDate = 'Выберите дату начала';
    if (!form.endDate) newErrors.endDate = 'Выберите дату окончания';

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (start >= end) newErrors.endDate = 'Дата окончания должна быть позже даты начала';

    if (form.quantity > gear.availableQuantity) {
      newErrors.quantity = `Доступно только ${gear.availableQuantity} шт.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const bookingData = {
        gearId: gear.id,
        gearName: gear.name,
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone
        },
        rental: {
          startDate: form.startDate,
          endDate: form.endDate,
          quantity: form.quantity,
          days,
          insurance: form.insurance
        },
        pricing: {
          basePrice,
          insuranceCost,
          totalPrice
        },
        comments: form.comments
      };

      const response = await fetch('/api/gear/rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        alert(`Заявка на аренду #${result.data.rentalId} создана! Мы свяжемся с вами для подтверждения.`);
        onBookingComplete();
      } else {
        throw new Error(result.error || 'Ошибка создания заявки');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Произошла ошибка при создании заявки. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof BookingForm, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          ←
        </button>
        <h2 className="text-2xl font-bold">Бронирование снаряжения</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gear Info */}
        <div>
          <h3 className="text-xl font-bold mb-4">Выбранное снаряжение</h3>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex gap-4 mb-4">
              <div className="w-20 h-20 bg-white/10 rounded-lg flex-shrink-0">
                {gear.imageUrl ? (
                  <Image src={gear.imageUrl} alt={gear.name} fill className="object-cover rounded-lg" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Backpack className="w-10 h-10 text-white/50" /></div>
                )}
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-lg">{gear.name}</h4>
                <p className="text-white/70 text-sm">{gear.category}</p>
                {gear.size && <p className="text-premium-gold text-sm">Размер: {gear.size}</p>}
                <p className={`text-sm ${
                  gear.condition === 'new' ? 'text-green-400' :
                  gear.condition === 'good' ? 'text-yellow-400' : 'text-orange-400'
                }`}>
                  Состояние: {
                    gear.condition === 'new' ? 'Новое' :
                    gear.condition === 'good' ? 'Хорошее' : 'Удовлетворительное'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Цена за день:</span>
                <span className="text-premium-gold">{gear.pricePerDay.toLocaleString('ru-RU')} ₽</span>
              </div>
              {gear.pricePerWeek && (
                <div className="flex justify-between">
                  <span>Цена за неделю:</span>
                  <span className="text-premium-gold">{gear.pricePerWeek.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Доступно:</span>
                <span>{gear.availableQuantity} шт.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div>
          <h3 className="text-xl font-bold mb-4">Параметры аренды</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="gear-booking-name" className="block text-sm font-medium mb-2">Имя *</label>
              <input
                id="gear-booking-name"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                  errors.name ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder="Введите ваше имя"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="gear-booking-email" className="block text-sm font-medium mb-2">Email *</label>
              <input
                id="gear-booking-email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                  errors.email ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder="example@email.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="gear-booking-phone" className="block text-sm font-medium mb-2">Телефон *</label>
              <input
                id="gear-booking-phone"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                  errors.phone ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder="+7 (999) 123-45-67"
              />
              {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gear-booking-start-date" className="block text-sm font-medium mb-2">Дата начала *</label>
                <input
                  id="gear-booking-start-date"
                  value={form.startDate}
                  onChange={(e) => updateForm('startDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                    errors.startDate ? 'border-red-500' : 'border-white/20'
                  }`}
                />
                {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>}
              </div>

              <div>
                <label htmlFor="gear-booking-end-date" className="block text-sm font-medium mb-2">Дата окончания *</label>
                <input
                  id="gear-booking-end-date"
                  value={form.endDate}
                  onChange={(e) => updateForm('endDate', e.target.value)}
                  min={form.startDate}
                  className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                    errors.endDate ? 'border-red-500' : 'border-white/20'
                  }`}
                />
                {errors.endDate && <p className="text-red-400 text-sm mt-1">{errors.endDate}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="gear-quantity" className="block text-sm font-medium mb-2">Количество *</label>
              <input
                id="gear-quantity"
                min="1"
                max={gear.availableQuantity}
                value={form.quantity}
                onChange={(e) => updateForm('quantity', parseInt(e.target.value) || 1)}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                  errors.quantity ? 'border-red-500' : 'border-white/20'
                }`}
              />
              {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>}
            </div>

            <div>
              <label htmlFor="gear-insurance" className="flex items-center gap-3">
                <input
                  id="gear-insurance"
                  type="checkbox"
                  checked={form.insurance}
                  onChange={(e) => updateForm('insurance', e.target.checked)}
                  className="text-premium-gold rounded"
                />
                <span>Добавить страховку (+10% от стоимости)</span>
              </label>
            </div>

            <div>
              <label htmlFor="gear-comments" className="block text-sm font-medium mb-2">Комментарии</label>
              <textarea
                id="gear-comments"
                value={form.comments}
                onChange={(e) => updateForm('comments', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
                rows={3}
                placeholder="Особые пожелания или требования"
              />
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-xl p-4">
              <h4 className="font-bold mb-3">Расчет стоимости</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Период аренды:</span>
                  <span>{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Базовая стоимость:</span>
                  <span>{basePrice.toLocaleString('ru-RU')} ₽</span>
                </div>
                {insuranceCost > 0 && (
                  <div className="flex justify-between">
                    <span>Страховка:</span>
                    <span>{insuranceCost.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Количество:</span>
                  <span>{form.quantity} шт.</span>
                </div>
                <hr className="border-white/20 my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого:</span>
                  <span className="text-premium-gold">{totalPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 disabled:opacity-50 disabled:cursor-not-allowed text-premium-black font-bold rounded-xl transition-colors text-lg"
            >
              {loading ? 'Создание заявки...' : `Забронировать за ${totalPrice.toLocaleString('ru-RU')} ₽`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
