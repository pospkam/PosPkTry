'use client';

/**
 * UI/UX SHOWCASE - Демонстрация всех улучшений
 * Используйте эти примеры в своих компонентах
 */

import React, { useState } from 'react';

export function UIShowcase() {
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(60);

  return (
    <div className="min-h-screen bg-premium-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gradient-gold">
            UI/UX Лайфхаки
          </h1>
          <p className="text-white/70 text-lg">
            Коллекция простых но эффективных улучшений интерфейса
          </p>
          <div className="divider-gold"></div>
        </div>

        {/* 1. Кнопки */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">1. Улучшенные кнопки</h2>
          <div className="flex flex-wrap gap-4">
            <button className="button-primary">
                Основная кнопка
            </button>
            <button className="button-secondary">
              Вторичная кнопка
            </button>
            <button className="button-primary" disabled>
              Отключена
            </button>
          </div>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            {`<button className="button-primary">Кнопка</button>`}
          </pre>
        </section>

        {/* 2. Карточки */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">2. Карточки с hover эффектом</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-premium hover-lift">
              <div className="icon-circle mb-4"> </div>
              <h3 className="text-xl font-bold mb-2">Hover Lift</h3>
              <p className="text-white/70">Поднимается при наведении</p>
            </div>
            <div className="card-premium hover-glow">
              <div className="icon-circle mb-4"> </div>
              <h3 className="text-xl font-bold mb-2">Hover Glow</h3>
              <p className="text-white/70">Светится при наведении</p>
            </div>
            <div className="card-premium hover-scale">
              <div className="icon-circle mb-4"> </div>
              <h3 className="text-xl font-bold mb-2">Hover Scale</h3>
              <p className="text-white/70">Увеличивается при наведении</p>
            </div>
          </div>
        </section>

        {/* 3. Input поля */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">3. Улучшенные Input&apos;ы</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="regular-input" className="block text-sm mb-2">Обычный input</label>
              <input
                id="regular-input"
                type="text"
                placeholder="Введите текст..."
                className="input-premium"
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                placeholder=" "
                className="input-premium"
                id="floating-input"
              />
              <label htmlFor="floating-input">Floating Label</label>
            </div>
          </div>
        </section>

        {/* 4. Badges */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">4. Badges и метки</h2>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-success">[] Success</span>
            <span className="badge badge-warning"> Warning</span>
            <span className="badge badge-error"> Error</span>
            <span className="badge badge-info">ℹ Info</span>
            <span className="badge badge-gold"> Premium</span>
          </div>
        </section>

        {/* 5. Progress bars */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">5. Индикаторы прогресса</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Прогресс</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setProgress(Math.max(0, progress - 10))}
                className="button-secondary"
              >
                -10%
              </button>
              <button
                onClick={() => setProgress(Math.min(100, progress + 10))}
                className="button-secondary"
              >
                +10%
              </button>
            </div>
          </div>
        </section>

        {/* 6. Loading states */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">6. Loading состояния</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center gap-4">
              <p>Spinner</p>
              <div className="spinner"></div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <p>Dots</p>
              <div className="spinner-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <p>Skeleton</p>
              <div className="w-full space-y-2">
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Tooltips */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">7. Tooltips</h2>
          <div className="flex gap-4">
            <span className="tooltip" data-tooltip="Это подсказка!">
              <button className="button-secondary">Наведи на меня</button>
            </span>
            <span className="tooltip" data-tooltip="Еще одна подсказка">
              <div className="icon-circle">i</div>
            </span>
          </div>
        </section>

        {/* 8. Toast */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">8. Toast уведомления</h2>
          <button
            onClick={() => {
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
            }}
            className="button-primary"
          >
            Показать уведомление
          </button>
          {showToast && (
            <div className="toast toast-success animate-slide-in-right">
              <div className="flex items-center gap-3">
                <span className="text-2xl">[]</span>
                <div>
                  <div className="font-bold">Успешно!</div>
                  <div className="text-sm text-white/70">Операция выполнена</div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 9. Modal */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">9. Модальные окна</h2>
          <button
            onClick={() => setShowModal(true)}
            className="button-primary"
          >
            Открыть модальное окно
          </button>
          {showModal && (
            <div 
              className="modal-overlay" 
              onClick={() => setShowModal(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Escape' && setShowModal(false)}
              aria-label="Закрыть модальное окно"
            >
              <div className="modal-content p-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <h3 className="text-2xl font-bold mb-4">Модальное окно</h3>
                <p className="text-white/70 mb-6">
                  Это пример красивого модального окна с плавной анимацией
                </p>
                <div className="flex gap-4">
                  <button className="button-primary">Применить</button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="button-secondary"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 10. Empty State */}
        <section className="card-premium">
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <div className="empty-state-title">Пока пусто</div>
            <div className="empty-state-description">
              Здесь появится контент, когда вы добавите данные
            </div>
            <button className="button-primary mt-4">Добавить</button>
          </div>
        </section>

        {/* 11. Gradient Text */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">11. Градиентный текст</h2>
          <h3 className="text-4xl font-bold text-gradient-gold">
            Золотой градиент
          </h3>
          <h3 className="text-4xl font-bold text-gradient-blue-gold">
            Радужный градиент
          </h3>
        </section>

        {/* 12. Icon Circles */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">12. Иконки в кружочках</h2>
          <div className="flex flex-wrap gap-4">
            {['🎯', '⭐', '🔥', '💎', '🎁', '🚀'].map((emoji, iconIndex) => (
              <div key={`icon-${iconIndex}`} className="icon-circle hover-scale">
                {emoji}
              </div>
            ))}
          </div>
        </section>

        {/* Код примеры */}
        <section className="card-premium space-y-4">
          <h2 className="text-2xl font-bold text-premium-gold">Как использовать</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-white/70 mb-2">1. Импортируйте стили в ваш компонент:</p>
              <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto">
                {`import '@/app/ui-improvements.css';`}
              </pre>
            </div>
            <div>
              <p className="text-white/70 mb-2">2. Используйте готовые классы:</p>
              <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto">
                {`<button className="button-primary">Кнопка</button>
<div className="card-premium hover-lift">...</div>
<input className="input-premium" />
<span className="badge badge-success">Успех</span>`}
              </pre>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
