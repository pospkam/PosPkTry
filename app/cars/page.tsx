'use client';

import React, { useState, useEffect } from 'react';

export default function CarRentalPage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const response = await fetch('/api/cars');
      const result = await response.json();
      if (result.success) setCars(result.data.cars);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-premium-black text-white">
      <div className="bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-black text-premium-gold mb-2">
            🚗 Прокат автомобилей
          </h1>
          <p className="text-white/70">
            Аренда автомобилей для путешествий по Камчатке
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-white/70">Загрузка автомобилей...</p>
          </div>
        ) : cars.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🚗</div>
            <p className="text-white/70 mb-4">Автомобили скоро появятся</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car: any) => (
              <div
                key={car.id}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors"
              >
                <div className="aspect-video bg-white/5 flex items-center justify-center">
                  <div className="text-6xl">🚗</div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-white mb-2">{car.name}</h3>
                  <div className="text-premium-gold font-bold">
                    {car.price_per_day?.toLocaleString('ru-RU')} ₽/день
                  </div>
                  <button className="w-full mt-4 px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-lg">
                    Забронировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

