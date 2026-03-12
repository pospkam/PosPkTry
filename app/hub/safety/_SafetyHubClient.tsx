'use client';

import React, { useState } from 'react';
import { MapPin, Truck, AlertTriangle, Star } from 'lucide-react';

export default function SafetyHubClient() {
  const [activeTab, setActiveTab] = useState('sos');

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">SOS и безопасность</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Экстренные службы и информация о безопасности</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {[
          { id: 'sos', label: 'SOS' },
          { id: 'emergency', label: 'МЧС' },
          { id: 'seismic', label: 'Сейсмика' },
          { id: 'weather', label: 'Погода' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'sos' && (
        <div className="space-y-5">
          <div className="border rounded-lg p-6 text-center"
            style={{
              borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)',
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)'
            }}>
            <AlertTriangle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--danger)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--danger)' }}>ЭКСТРЕННЫЙ ВЫЗОВ</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">В случае экстренной ситуации</p>
            <button
              className="px-8 py-3 rounded-lg text-lg font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--danger)' }}
            >
              ВЫЗВАТЬ SOS
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Экстренные номера</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">МЧС</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">112</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Полиция</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">102</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Скорая</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">103</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Ваша локация</h3>
              <div className="text-center text-[var(--text-muted)] py-4">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-sm">Координаты загружаются...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">МЧС Камчатки</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <div className="text-center text-[var(--text-muted)] py-8">
              <Truck className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm">Информация МЧС загружается...</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seismic' && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Сейсмическая активность</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <div className="text-center text-[var(--text-muted)] py-8">
              <p className="text-sm">Данные сейсмики загружаются...</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'weather' && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Погодные условия</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <div className="text-center text-[var(--text-muted)] py-8">
              <p className="text-sm">Прогноз погоды загружается...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
