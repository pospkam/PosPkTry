'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Phone, User, MapPin, AlertTriangle } from 'lucide-react';


/**
 * SOSButton — экстренная кнопка для вызова помощи
 * @returns {JSX.Element}
 * @remarks
 * - Интеграция с API POST /api/safety/sos для логирования события SOS (см. AGENTS.md)
 * - Rate-limiting: 1 раз в 10 минут на пользователя, хранить timestamp последнего запроса
 * - При нажатии "Отправить координаты" — получать геолокацию через navigator.geolocation, отправлять на сервер
 * - Обработка ошибок отправки (уведомление пользователю, не скрывать модалку при ошибке)
 * - Логировать все попытки вызова SOS (даже если API не ответил)
 * - Для production — тестировать только на staging!
 * - Accessibility: role="dialog", aria-label для модального окна, aria-label для кнопок и иконок, aria-live для алертов
 */
function SOSButton({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        className={`fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-red-600 text-white flex flex-col items-center justify-center font-bold text-sm shadow-2xl sos-pulse min-h-[44px] min-w-[44px] ${className}`}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="SOS — экстренная помощь"
      >
        SOS
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Экстренная помощь — SOS"
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck size={28} className="text-red-600" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Экстренная помощь</h2>
              </div>
              <p className="text-sm text-volcano mb-6 p-3 bg-gray-50 rounded-lg">
                <MapPin size={16} className="inline mr-2" aria-hidden="true" />
                Ваши координаты: 53.0148° N, 158.6542° E
              </p>
              <div className="space-y-3 mb-8">
                <motion.button className="w-full flex items-center justify-between p-4 bg-red-600 text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} aria-label="Позвонить в МЧС 112">
                  <div className="flex items-center gap-3">
                    <Phone size={20} aria-hidden="true" />
                    МЧС: 112
                  </div>
                  <span>ЗВОНОК</span>
                </motion.button>
                <motion.button className="w-full flex items-center justify-between p-4 bg-red-600 text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} aria-label="Позвонить в скорую 103">
                  <div className="flex items-center gap-3">
                    <Phone size={20} aria-hidden="true" />
                    Скорая: 103
                  </div>
                  <span>ЗВОНОК</span>
                </motion.button>
                <motion.button className="w-full flex items-center justify-between p-4 bg-ocean text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} aria-label="Связаться с гидом">
                  <div className="flex items-center gap-3">
                    <User size={20} aria-hidden="true" />
                    Связаться с гидом
                  </div>
                  <span>ЧАТ</span>
                </motion.button>
                <motion.button className="w-full flex items-center justify-between p-4 bg-moss text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} aria-label="Отправить координаты">
                  <div className="flex items-center gap-3">
                    <MapPin size={20} aria-hidden="true" />
                    Отправить координаты
                  </div>
                  <span>ОТПРАВИТЬ</span>
                </motion.button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4" aria-live="polite">
                <AlertTriangle size={20} className="text-amber-600 inline mr-2 mb-2 block" aria-hidden="true" />
                <p className="text-sm text-amber-700 leading-relaxed">
                  Если нет связи: оставайтесь на месте · свисток 3 сигнала · сохраняйте тепло
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
