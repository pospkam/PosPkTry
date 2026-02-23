'use client';

import React, { useState } from 'react';
import { MapPin, Volcano, Sun, Cloud, CloudRain, Wind, Flame } from 'lucide-react';
import { PublicNav } from '@/components/shared/PublicNav';

export default function SafetyHub() {
  const [activeTab, setActiveTab] = useState('sos');

  return (
    <main className="min-h-screen bg-transparent text-white">
      <PublicNav />
      {/* Header */}
      <div className="bg-white/15 border-b border-white/15 p-6">
        <h1 className="text-3xl font-black text-white">SOS и безопасность</h1>
        <p className="text-white/70">Экстренные службы и информация о безопасности</p>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 border-b border-white/15">
        <div className="flex space-x-4">
          {[
            { id: 'sos', label: 'SOS' },
            { id: 'emergency', label: 'МЧС' },
            { id: 'seismic', label: 'Сейсмика' },
            { id: 'weather', label: 'Погода' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'sos' && (
          <div className="space-y-6">
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">ЭКСТРЕННЫЙ ВЫЗОВ</h2>
              <p className="text-white/70 mb-4">В случае экстренной ситуации</p>
              <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-xl text-xl">
                ВЫЗВАТЬ SOS
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Экстренные номера</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>МЧС</span>
                    <span className="font-mono">112</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Полиция</span>
                    <span className="font-mono">102</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Скорая</span>
                    <span className="font-mono">103</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Ваша локация</h3>
                <div className="text-center text-white/70">
                  <div className="text-4xl mb-2"><MapPin className="w-4 h-4" /></div>
                  <p>Координаты загружаются...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">МЧС Камчатки</h2>
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <div className="text-center text-white/70 py-8">
                <div className="text-4xl mb-2">🚒</div>
                <p>Информация МЧС загружается...</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seismic' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Сейсмическая активность</h2>
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <div className="text-center text-white/70 py-8">
                <div className="text-4xl mb-2"></div>
                <p>Данные сейсмики загружаются...</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Погодные условия</h2>
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <div className="text-center text-white/70 py-8">
                <div className="text-4xl mb-2"></div>
                <p>Прогноз погоды загружается...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}