'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { SouvenirCard } from '@/components/souvenirs/SouvenirCard';
import { ShoppingCart } from '@/components/souvenirs/ShoppingCart';
import { SouvenirCheckout } from '@/components/souvenirs/SouvenirCheckout';
import { SouvenirFilters } from '@/components/souvenirs/SouvenirFilters';
import { LoadingSpinner } from '@/components/admin/shared';

interface Souvenir {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  inStock: boolean;
  rating?: number;
}

interface CartItem {
  id: string;
  souvenirId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export default function SouvenirsHub() {
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'catalog' | 'cart' | 'checkout'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'rating'>('name');

  useEffect(() => {
    fetchSouvenirs();
  }, []);

  const fetchSouvenirs = async () => {
    try {
      setLoading(true);

      // Запрос к API сувениров
      const response = await fetch('/api/souvenirs?limit=50');
      const result = await response.json();

      if (result.success) {
        setSouvenirs(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch souvenirs');
      }
    } catch (err) {
      console.error('Error fetching souvenirs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (souvenirId: string) => {
    const souvenir = souvenirs.find(s => s.id === souvenirId);
    if (!souvenir) return;

    const existingItem = cart.find(item => item.souvenirId === souvenirId);

    if (existingItem) {
      setCart(cart.map(item =>
        item.souvenirId === souvenirId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: `cart-${Date.now()}`,
        souvenirId,
        name: souvenir.name,
        price: souvenir.price,
        quantity: 1,
        imageUrl: souvenir.imageUrl
      }]);
    }

    setView('cart');
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemove(itemId);
      return;
    }

    setCart(cart.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const handleRemove = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const handleCheckout = () => {
    setView('checkout');
  };

  const handleBackToCatalog = () => {
    setView('catalog');
  };

  const handleBackToCart = () => {
    setView('cart');
  };

  const handleOrderComplete = () => {
    setCart([]);
    setView('catalog');
    alert('Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.');
  };

  // Фильтрация и сортировка товаров
  const getFilteredAndSortedSouvenirs = () => {
    let filtered = souvenirs.filter(souvenir => {
      // Фильтр по категории
      if (selectedCategory !== 'all' && souvenir.category !== selectedCategory) {
        return false;
      }

      // Фильтр по цене
      if (souvenir.price < priceRange.min || souvenir.price > priceRange.max) {
        return false;
      }

      // Фильтр по наличию
      if (showInStockOnly && !souvenir.inStock) {
        return false;
      }

      return true;
    });

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  };

  const categories = ['all', ...Array.from(new Set(souvenirs.map(s => s.category)))];
  const filteredSouvenirs = getFilteredAndSortedSouvenirs();

  if (loading) {
    return (
      <Protected roles={['tourist', 'admin']}>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <LoadingSpinner message="Загрузка сувениров..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['tourist', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-white">Сувениры Камчатки</h1>
              <p className="text-white/70">Уникальные подарки и сувениры</p>
            </div>

            <div className="flex items-center gap-4">
              {view !== 'catalog' && (
                <button
                  onClick={handleBackToCatalog}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  ← Каталог
                </button>
              )}

              <button
                onClick={() => setView(view === 'cart' ? 'catalog' : 'cart')}
                className="relative px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-xl transition-colors"
              >
                🛒 Корзина
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Content based on current view */}
          {view === 'catalog' && (
            <>
              {/* Filters */}
              <SouvenirFilters
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                showInStockOnly={showInStockOnly}
                onInStockToggle={setShowInStockOnly}
                sortBy={sortBy}
                onSortChange={(value) => setSortBy(value as typeof sortBy)}
              />

              {/* Catalog */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSouvenirs.map((souvenir) => (
                  <SouvenirCard
                    key={souvenir.id}
                    souvenir={souvenir}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              {filteredSouvenirs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/70 text-lg">Товары не найдены</p>
                  <p className="text-white/50">Попробуйте изменить фильтры</p>
                </div>
              )}
            </>
          )}

          {view === 'cart' && (
            <ShoppingCart
              items={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
              onCheckout={handleCheckout}
            />
          )}

          {view === 'checkout' && (
            <SouvenirCheckout
              items={cart}
              onBack={handleBackToCart}
              onOrderComplete={handleOrderComplete}
            />
          )}
        </div>
      </main>
    </Protected>
  );
}