'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface SystemSettings {
  [category: string]: {
    [key: string]: {
      value: string;
      description: string;
      updatedAt: string;
    };
  };
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const result = await response.json();

      if (result.success) {
        setSettings(result.data.settings);
        setChanges({});
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category: string, key: string, value: string) => {
    const settingKey = `${category}.${key}`;
    setChanges(prev => ({
      ...prev,
      [settingKey]: value
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Преобразуем изменения обратно в структуру настроек
      const settingsUpdate: any = {};
      Object.entries(changes).forEach(([key, value]) => {
        const [category, settingKey] = key.split('.');
        if (!settingsUpdate[category]) {
          settingsUpdate[category] = {};
        }
        settingsUpdate[category][settingKey] = value;
      });

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsUpdate })
      });

      const result = await response.json();

      if (result.success) {
        setChanges({});
        fetchSettings(); // Перезагружаем настройки
        alert('Настройки сохранены успешно');
      } else {
        alert(`Ошибка: ${result.error}`);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner message="Загрузка настроек системы..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <p className="text-red-400 mb-4">Ошибка загрузки настроек</p>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Системные настройки</h3>
        <div className="flex gap-3">
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Обновить
          </button>
          <button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className="px-6 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>

      {/* Категории настроек */}
      {Object.entries(settings).map(([category, categorySettings]) => (
        <div key={category} className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4 capitalize">
            {category === 'general' ? 'Общие' :
             category === 'payment' ? 'Платежи' :
             category === 'email' ? 'Email' :
             category === 'booking' ? 'Бронирования' :
             category.replace('_', ' ')}
          </h4>

          <div className="space-y-4">
            {Object.entries(categorySettings).map(([key, setting]) => {
              const settingKey = `${category}.${key}`;
              const currentValue = changes[settingKey] ?? setting.value;
              const hasChange = changes[settingKey] !== undefined;

              return (
                <div key={key} className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-white font-medium mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {hasChange && <span className="text-premium-gold ml-2">•</span>}
                    </label>
                    <p className="text-white/60 text-sm mb-3">{setting.description}</p>

                    {/* Разные типы полей в зависимости от ключа */}
                    {key.includes('enabled') || key.includes('active') ? (
                      <select
                        value={currentValue}
                        onChange={(e) => handleSettingChange(category, key, e.target.value)}
                        className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                      >
                        <option value="true">Включено</option>
                        <option value="false">Отключено</option>
                      </select>
                    ) : key.includes('rate') || key.includes('fee') || key.includes('price') ? (
                      <input
                        type="number"
                        step="0.01"
                        value={currentValue}
                        onChange={(e) => handleSettingChange(category, key, e.target.value)}
                        className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                        placeholder="0.00"
                      />
                    ) : (
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => handleSettingChange(category, key, e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                        placeholder="Значение настройки"
                      />
                    )}
                  </div>

                  <div className="text-white/40 text-sm">
                    Обновлено: {new Date(setting.updatedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(settings).length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-white/60">Настройки не найдены</p>
        </div>
      )}
    </div>
  );
}

