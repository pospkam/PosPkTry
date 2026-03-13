'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  souvenirId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface SouvenirCheckoutProps {
  items: CartItem[];
  onBack: () => void;
  onOrderComplete: () => void;
}

interface OrderForm {
  name: string;
  email: string;
  phone: string;
  deliveryMethod: 'pickup' | 'delivery';
  address?: string;
  comments?: string;
}

export function SouvenirCheckout({ items, onBack, onOrderComplete }: SouvenirCheckoutProps) {
  const [form, setForm] = useState<OrderForm>({
    name: '',
    email: '',
    phone: '',
    deliveryMethod: 'pickup',
    address: '',
    comments: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Введите имя';
    if (!form.email.trim()) newErrors.email = 'Введите email';
    if (!form.phone.trim()) newErrors.phone = 'Введите телефон';

    if (form.deliveryMethod === 'delivery' && !form.address?.trim()) {
      newErrors.address = 'Введите адрес доставки';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Создаем заказ
      const orderData = {
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone
        },
        items: items.map(item => ({
          souvenirId: item.souvenirId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        delivery: {
          method: form.deliveryMethod,
          address: form.deliveryMethod === 'delivery' ? form.address : undefined
        },
        comments: form.comments,
        totalPrice,
        totalItems
      };

      const response = await fetch('/api/souvenirs/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Заказ #${result.data.orderId} успешно создан! Мы свяжемся с вами в ближайшее время.`);
        onOrderComplete();
      } else {
        throw new Error(result.error || 'Ошибка создания заказа');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Произошла ошибка при создании заказа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof OrderForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
        >
          ←
        </button>
        <h2 className="text-2xl font-bold">Оформление заказа</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <h3 className="text-xl font-bold mb-4">Ваш заказ</h3>

          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div key={item.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-[var(--bg-card)] rounded-lg flex-shrink-0">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover rounded-lg" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[var(--accent)] font-bold">
                        {item.price.toLocaleString('ru-RU')} ₽
                      </span>
                      <span className="text-[var(--text-muted)]">× {item.quantity}</span>
                      <span className="text-[var(--accent)] font-bold">
                        {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-bold">Итого:</span>
              <span className="text-2xl font-bold text-[var(--accent)]">
                {totalPrice.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
            </p>
          </div>
        </div>

        {/* Order Form */}
        <div>
          <h3 className="text-xl font-bold mb-4">Контактные данные</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="checkout-name" className="block text-sm font-medium mb-2">Имя *</label>
              <input
                id="checkout-name"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className={`w-full px-4 py-3 bg-[var(--bg-card)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                  errors.name ? 'border-red-500' : 'border-[var(--border)]'
                }`}
                placeholder="Введите ваше имя"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="checkout-email" className="block text-sm font-medium mb-2">Email *</label>
              <input
                id="checkout-email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className={`w-full px-4 py-3 bg-[var(--bg-card)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                  errors.email ? 'border-red-500' : 'border-[var(--border)]'
                }`}
                placeholder="example@email.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="checkout-phone" className="block text-sm font-medium mb-2">Телефон *</label>
              <input
                id="checkout-phone"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className={`w-full px-4 py-3 bg-[var(--bg-card)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                  errors.phone ? 'border-red-500' : 'border-[var(--border)]'
                }`}
                placeholder="+7 (999) 123-45-67"
              />
              {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <span className="block text-sm font-medium mb-3">Способ получения</span>
              <div className="space-y-2">
                <label htmlFor="delivery-pickup" className="flex items-center gap-3">
                  <input
                    id="delivery-pickup"
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    checked={form.deliveryMethod === 'pickup'}
                    onChange={(e) => updateForm('deliveryMethod', e.target.value as 'pickup' | 'delivery')}
                    className="text-[var(--accent)]"
                  />
                  <span>Самовывоз из офиса</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="delivery"
                    checked={form.deliveryMethod === 'delivery'}
                    onChange={(e) => updateForm('deliveryMethod', e.target.value as 'pickup' | 'delivery')}
                    className="text-[var(--accent)]"
                  />
                  <span>Доставка</span>
                </label>
              </div>
            </div>

            {form.deliveryMethod === 'delivery' && (
              <div>
                <label htmlFor="checkout-address" className="block text-sm font-medium mb-2">Адрес доставки *</label>
                <textarea
                  id="checkout-address"
                  value={form.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  className={`w-full px-4 py-3 bg-[var(--bg-card)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none ${
                    errors.address ? 'border-red-500' : 'border-[var(--border)]'
                  }`}
                  rows={3}
                  placeholder="Укажите полный адрес доставки"
                />
                {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address}</p>}
              </div>
            )}

            <div>
              <label htmlFor="checkout-comments" className="block text-sm font-medium mb-2">Комментарии к заказу</label>
              <textarea
                id="checkout-comments"
                value={form.comments}
                onChange={(e) => updateForm('comments', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                rows={3}
                placeholder="Особые пожелания или комментарии"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 bg-[var(--accent)] hover:bg-[var(--accent)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--bg-primary)] font-bold rounded-lg transition-colors text-lg"
            >
              {loading ? 'Создание заказа...' : `Оформить заказ на ${totalPrice.toLocaleString('ru-RU')} ₽`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
