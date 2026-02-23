'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  transmission: 'manual' | 'automatic';
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  seats: number;
  pricePerDay: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  imageUrl?: string;
  isAvailable: boolean;
  rating?: number;
  category: 'economy' | 'comfort' | 'business' | 'suv' | 'luxury';
  features: string[];
  deposit: number;
}

interface CarBookingFormProps {
  car: Car;
  onBookingComplete: () => void;
  onCancel: () => void;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  driverLicense: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  insurance: 'basic' | 'premium' | 'none';
  additionalDrivers: boolean;
  gps: boolean;
  childSeat: boolean;
  comments?: string;
}

export function CarBookingForm({ car, onBookingComplete, onCancel }: CarBookingFormProps) {
  const [form, setForm] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    driverLicense: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 дня по умолчанию
    pickupLocation: 'Петропавловск-Камчатский',
    returnLocation: 'Петропавловск-Камчатский',
    insurance: 'basic',
    additionalDrivers: false,
    gps: false,
    childSeat: false,
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

  // Расчет стоимости аренды
  let rentalPrice = 0;
  if (days >= 30 && car.pricePerMonth) {
    rentalPrice = car.pricePerMonth;
  } else if (days >= 7 && car.pricePerWeek) {
    rentalPrice = car.pricePerWeek;
  } else {
    rentalPrice = car.pricePerDay * days;
  }

  // Стоимость страховки
  const insuranceCost = form.insurance === 'premium' ? Math.round(rentalPrice * 0.15) :
                        form.insurance === 'basic' ? Math.round(rentalPrice * 0.08) : 0;

  // Стоимость дополнительных опций
  const additionalDriversCost = form.additionalDrivers ? Math.round(rentalPrice * 0.05) : 0;
  const gpsCost = form.gps ? 500 * days : 0;
  const childSeatCost = form.childSeat ? 300 * days : 0;

  const totalPrice = rentalPrice + insuranceCost + additionalDriversCost + gpsCost + childSeatCost;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Введите ФИО';
    if (!form.email.trim()) newErrors.email = 'Введите email';
    if (!form.phone.trim()) newErrors.phone = 'Введите телефон';
    if (!form.driverLicense.trim()) newErrors.driverLicense = 'Введите номер ВУ';
    if (!form.startDate) newErrors.startDate = 'Выберите дату начала';
    if (!form.endDate) newErrors.endDate = 'Выберите дату окончания';

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (start >= end) newErrors.endDate = 'Дата окончания должна быть позже даты начала';

    // Проверка возраста водителя (минимум 21 год для большинства автомобилей)
    if (form.driverLicense) {
      // Простая проверка формата
      if (!/^[0-9]{2}[0-9]{2}[0-9]{6}$/.test(form.driverLicense.replace(/\s/g, ''))) {
        newErrors.driverLicense = 'Неверный формат номера ВУ';
      }
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
        carId: car.id,
        carName: `${car.brand} ${car.model} ${car.year}`,
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          driverLicense: form.driverLicense
        },
        rental: {
          startDate: form.startDate,
          endDate: form.endDate,
          days,
          pickupLocation: form.pickupLocation,
          returnLocation: form.returnLocation,
          insurance: form.insurance,
          additionalDrivers: form.additionalDrivers,
          gps: form.gps,
          childSeat: form.childSeat
        },
        pricing: {
          rentalPrice,
          insuranceCost,
          additionalDriversCost,
          gpsCost,
          childSeatCost,
          deposit: car.deposit,
          totalPrice
        },
        comments: form.comments
      };

      const response = await fetch('/api/cars/rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        alert(`Заявка на аренду #${result.data.rentalId} создана! Мы свяжемся с вами для подтверждения. Не забудьте залог ${car.deposit.toLocaleString('ru-RU')} ₽.`);
        onBookingComplete();
      } else {
        throw new Error(result.error || 'Ошибка создания заявки');
      }
    } catch (error) {
      console.error('Car booking error:', error);
      alert('Произошла ошибка при создании заявки. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof BookingForm, value: string | boolean) => {
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
        <h2 className="text-2xl font-bold">Бронирование автомобиля</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Car Info */}
        <div>
          <h3 className="text-xl font-bold mb-4">Выбранный автомобиль</h3>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex gap-4 mb-4">
              <div className="w-20 h-20 bg-white/10 rounded-lg flex-shrink-0">
                {car.imageUrl ? (
                  <Image src={car.imageUrl} alt={`${car.brand} ${car.model}`} fill className="object-cover rounded-lg" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl"></div>
                )}
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-lg">{car.brand} {car.model}</h4>
                <p className="text-white/70">{car.year} год</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <span> {car.transmission === 'automatic' ? 'Автомат' : 'Механика'}</span>
                  <span>⛽ {car.fuelType === 'petrol' ? 'Бензин' : car.fuelType === 'diesel' ? 'Дизель' : car.fuelType === 'electric' ? 'Электро' : 'Гибрид'}</span>
                  <span> {car.seats} мест</span>
                  <span>🔄 {car.category === 'economy' ? 'Эконом' : car.category === 'comfort' ? 'Комфорт' : car.category === 'business' ? 'Бизнес' : car.category === 'suv' ? 'Внедорожник' : 'Люкс'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Цена за день:</span>
                <span className="text-premium-gold">{car.pricePerDay.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Залог:</span>
                <span className="text-orange-400">{car.deposit.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div>
          <h3 className="text-xl font-bold mb-4">Данные арендатора</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="booking-name" className="block text-sm font-medium mb-2">ФИО *</label>
              <input
                id="booking-name"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                  errors.name ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder="Иванов Иван Иванович"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="booking-email" className="block text-sm font-medium mb-2">Email *</label>
                <input
                  id="booking-email"
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
                <label htmlFor="booking-phone" className="block text-sm font-medium mb-2">Телефон *</label>
                <input
                  id="booking-phone"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                    errors.phone ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="+7 (999) 123-45-67"
                />
                {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="booking-driver-license" className="block text-sm font-medium mb-2">Номер водительских прав *</label>
              <input
                id="booking-driver-license"
                value={form.driverLicense}
                onChange={(e) => updateForm('driverLicense', e.target.value)}
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold ${
                  errors.driverLicense ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder="12 34 567890"
              />
              {errors.driverLicense && <p className="text-red-400 text-sm mt-1">{errors.driverLicense}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="booking-start-date" className="block text-sm font-medium mb-2">Дата начала *</label>
                <input
                  id="booking-start-date"
                  type="date"
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
                <label htmlFor="booking-end-date" className="block text-sm font-medium mb-2">Дата окончания *</label>
                <input
                  id="booking-end-date"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="booking-pickup-location" className="block text-sm font-medium mb-2">Место получения</label>
                <select
                  id="booking-pickup-location"
                  value={form.pickupLocation}
                  onChange={(e) => updateForm('pickupLocation', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                >
                  <option value="Петропавловск-Камчатский">Петропавловск-Камчатский</option>
                  <option value="Елизово">Елизово</option>
                  <option value="Вилючинск">Вилючинск</option>
                </select>
              </div>

              <div>
                <label htmlFor="booking-return-location" className="block text-sm font-medium mb-2">Место возврата</label>
                <select
                  id="booking-return-location"
                  value={form.returnLocation}
                  onChange={(e) => updateForm('returnLocation', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                >
                  <option value="Петропавловск-Камчатский">Петропавловск-Камчатский</option>
                  <option value="Елизово">Елизово</option>
                  <option value="Вилючинск">Вилючинск</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="booking-insurance-none" className="block text-sm font-medium mb-3">Страховка</label>
              <div className="space-y-2">
                <label htmlFor="insurance-none" className="flex items-center gap-3">
                  <input
                    id="insurance-none"
                    name="insurance"
                    value="none"
                    checked={form.insurance === 'none'}
                    onChange={(e) => updateForm('insurance', e.target.value as 'basic' | 'premium' | 'none')}
                    className="text-premium-gold"
                  />
                  <span>Без страховки</span>
                </label>

                <label htmlFor="insurance-basic" className="flex items-center gap-3">
                  <input
                    id="insurance-basic"
                    checked={form.insurance === 'basic'}
                    onChange={(e) => updateForm('insurance', e.target.value as 'basic' | 'premium' | 'none')}
                    className="text-premium-gold"
                  />
                  <span>Базовая страховка (+8%)</span>
                </label>

                <label htmlFor="insurance-premium" className="flex items-center gap-3">
                  <input
                    id="insurance-premium"
                    checked={form.insurance === 'premium'}
                    onChange={(e) => updateForm('insurance', e.target.value as 'basic' | 'premium' | 'none')}
                    className="text-premium-gold"
                  />
                  <span>Премиум страховка (+15%)</span>
                </label>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium mb-3">Дополнительные опции</p>
              <div className="space-y-2">
                <label htmlFor="opt-additional-driver" className="flex items-center justify-between">
                  <span>Дополнительный водитель (+5%)</span>
                  <input
                    id="opt-additional-driver"
                    type="checkbox"
                    checked={form.additionalDrivers}
                    onChange={(e) => updateForm('additionalDrivers', e.target.checked)}
                    className="text-premium-gold rounded"
                  />
                </label>

                <label htmlFor="opt-gps" className="flex items-center justify-between">
                  <span>GPS навигатор (+500₽/день)</span>
                  <input
                    id="opt-gps"
                    type="checkbox"
                    checked={form.gps}
                    onChange={(e) => updateForm('gps', e.target.checked)}
                    className="text-premium-gold rounded"
                  />
                </label>

                <label htmlFor="opt-child-seat" className="flex items-center justify-between">
                  <span>Детское кресло (+300₽/день)</span>
                  <input
                    id="opt-child-seat"
                    type="checkbox"
                    checked={form.childSeat}
                    onChange={(e) => updateForm('childSeat', e.target.checked)}
                    className="text-premium-gold rounded"
                  />
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="booking-comments" className="block text-sm font-medium mb-2">Комментарии</label>
              <textarea
                id="booking-comments"
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
                  <span>Аренда автомобиля:</span>
                  <span>{rentalPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
                {insuranceCost > 0 && (
                  <div className="flex justify-between">
                    <span>Страховка:</span>
                    <span>{insuranceCost.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                {additionalDriversCost > 0 && (
                  <div className="flex justify-between">
                    <span>Дополнительный водитель:</span>
                    <span>{additionalDriversCost.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                {gpsCost > 0 && (
                  <div className="flex justify-between">
                    <span>GPS навигатор:</span>
                    <span>{gpsCost.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                {childSeatCost > 0 && (
                  <div className="flex justify-between">
                    <span>Детское кресло:</span>
                    <span>{childSeatCost.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                <hr className="border-white/20 my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого:</span>
                  <span className="text-premium-gold">{totalPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-sm text-orange-400">
                  <span>Залог:</span>
                  <span>{car.deposit.toLocaleString('ru-RU')} ₽</span>
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
