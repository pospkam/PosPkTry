'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Phone, User, MapPin, AlertTriangle } from 'lucide-react';

export function SOSButton({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        className={`fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-red-600 text-white flex flex-col items-center justify-center font-bold text-sm shadow-2xl sos-pulse min-h-[44px] min-w-[44px] ${className}`}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="SOS - экстренная помощь"
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
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck size={28} className="text-red-600" />
                <h2 className="text-xl font-bold text-gray-800">Экстренная помощь</h2>
              </div>
              <p className="text-sm text-volcano mb-6 p-3 bg-gray-50 rounded-lg">
                <MapPin size={16} className="inline mr-2" />
                Ваши координаты: 53.0148° N, 158.6542° E
              </p>
              <div className="space-y-3 mb-8">
                <motion.button className="w-full flex items-center justify-between p-4 bg-red-600 text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className="flex items-center gap-3">
                    <Phone size={20} />
                    МЧС: 112
                  </div>
                  <span>ЗВОНОК</span>
                </motion.button>
                <motion.button className="w-full flex items-center justify-between p-4 bg-red-600 text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className="flex items-center gap-3">
                    <Phone size={20} />
                    Скорая: 103
                  </div>
                  <span>ЗВОНОК</span>
                </motion.button>
                <motion.button className="w-full flex items-center justify-between p-4 bg-ocean text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className="flex items-center gap-3">
                    <User size={20} />
                    Связаться с гидом
                  </div>
                  <span>ЧАТ</span>
                </motion.button>
                <motion.button className="w-full flex items-center justify-between p-4 bg-moss text-white rounded-xl font-semibold min-h-[44px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className="flex items-center gap-3">
                    <MapPin size={20} />
                    Отправить координаты
                  </div>
                  <span>ОТПРАВИТЬ</span>
                </motion.button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle size={20} className="text-amber-600 inline mr-2 mb-2 block" />
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
