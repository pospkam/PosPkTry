'use client';

import React from 'react';

interface CartItem {
  id: string;
  souvenirId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
}

export function ShoppingCart({ items, onUpdateQuantity, onRemove, onCheckout }: ShoppingCartProps) {
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-white/70 text-lg">Корзина пуста</p>
        <p className="text-white/50 text-sm mt-2">Добавьте товары из каталога</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">Корзина ({totalItems})</h2>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4"
          >
            {/* Image */}
            <div className="w-20 h-20 bg-white/10 rounded-lg flex-shrink-0">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🎁
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{item.name}</h3>
              <p className="text-premium-gold font-bold">
                {item.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                +
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(item.id)}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">Итого:</span>
          <span className="text-3xl font-black text-premium-gold">
            {totalPrice.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <p className="text-white/50 text-sm mt-2">
          {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
        </p>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors text-lg"
      >
        Оформить заказ
      </button>
    </div>
  );
}


import React from 'react';

interface CartItem {
  id: string;
  souvenirId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
}

export function ShoppingCart({ items, onUpdateQuantity, onRemove, onCheckout }: ShoppingCartProps) {
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-white/70 text-lg">Корзина пуста</p>
        <p className="text-white/50 text-sm mt-2">Добавьте товары из каталога</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">Корзина ({totalItems})</h2>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4"
          >
            {/* Image */}
            <div className="w-20 h-20 bg-white/10 rounded-lg flex-shrink-0">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🎁
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{item.name}</h3>
              <p className="text-premium-gold font-bold">
                {item.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                +
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(item.id)}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">Итого:</span>
          <span className="text-3xl font-black text-premium-gold">
            {totalPrice.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <p className="text-white/50 text-sm mt-2">
          {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
        </p>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors text-lg"
      >
        Оформить заказ
      </button>
    </div>
  );
}


import React from 'react';

interface CartItem {
  id: string;
  souvenirId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
}

export function ShoppingCart({ items, onUpdateQuantity, onRemove, onCheckout }: ShoppingCartProps) {
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-white/70 text-lg">Корзина пуста</p>
        <p className="text-white/50 text-sm mt-2">Добавьте товары из каталога</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">Корзина ({totalItems})</h2>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4"
          >
            {/* Image */}
            <div className="w-20 h-20 bg-white/10 rounded-lg flex-shrink-0">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🎁
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{item.name}</h3>
              <p className="text-premium-gold font-bold">
                {item.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                +
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(item.id)}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">Итого:</span>
          <span className="text-3xl font-black text-premium-gold">
            {totalPrice.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <p className="text-white/50 text-sm mt-2">
          {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
        </p>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors text-lg"
      >
        Оформить заказ
      </button>
    </div>
  );
}


import React from 'react';

interface CartItem {
  id: string;
  souvenirId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
}

export function ShoppingCart({ items, onUpdateQuantity, onRemove, onCheckout }: ShoppingCartProps) {
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-white/70 text-lg">Корзина пуста</p>
        <p className="text-white/50 text-sm mt-2">Добавьте товары из каталога</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">Корзина ({totalItems})</h2>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4"
          >
            {/* Image */}
            <div className="w-20 h-20 bg-white/10 rounded-lg flex-shrink-0">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🎁
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{item.name}</h3>
              <p className="text-premium-gold font-bold">
                {item.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                +
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(item.id)}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">Итого:</span>
          <span className="text-3xl font-black text-premium-gold">
            {totalPrice.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <p className="text-white/50 text-sm mt-2">
          {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
        </p>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors text-lg"
      >
        Оформить заказ
      </button>
    </div>
  );
}





























