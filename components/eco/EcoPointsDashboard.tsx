'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Leaf, TreePine, Wind, Trash2, Users, Star, Camera, Bus, ChevronRight, Gift } from 'lucide-react';

const metrics = [
  { icon: TreePine, value: 12, label: 'деревьев посажено', color: 'moss' },
  { icon: Wind, value: 45, label: 'кг CO₂ сэкономлено', color: 'ocean' },
  { icon: Trash2, value: 8, label: 'кг мусора собрано', color: 'volcano' },
  { icon: Users, value: 3, label: 'групповых тура', color: 'volcano' },
];

const actions = [
  { icon: Star, action: 'Оставить отзыв', points: 50 },
  { icon: Camera, action: 'Загрузить фото', points: 30 },
  { icon: Bus, action: 'Групповой трансфер', points: 20 },
];

export function EcoPointsDashboard({ points = 1250 }: { points?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div 
      ref={ref}
      className="glassmorphism p-6 rounded-2xl shadow-xl"
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <div className="flex justify-between items-baseline mb-6">
        <div className="flex items-center gap-3">
          <Leaf size={28} className="text-moss" />
          <h3 className="text-lg font-semibold text-gray-800">Ваши Eco-Points</h3>
        </div>
        <motion.h2 
          className="text-3xl font-bold text-moss"
          variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
        >
          {points.toLocaleString()}
        </motion.h2>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {metrics.map((metric, i) => (
          <motion.div 
            key={i} 
            className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl hover:bg-white/70 transition-all" 
            variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
            whileHover={{ scale: 1.02 }}
          >
            <metric.icon size={32} className={`text-${metric.color} mx-auto mb-3`} />
            <p className="text-2xl font-bold text-gray-800 mb-1">{metric.value}</p>
            <p className="text-sm text-volcano">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-8">
        <h4 className="text-base font-semibold text-gray-800 mb-4">Заработать больше</h4>
        <div className="space-y-2">
          {actions.map((action, i) => (
            <motion.div 
              key={i} 
              className="bg-white/50 backdrop-blur-sm rounded-xl px-4 py-3 hover:bg-white/80 transition-all flex justify-between items-center cursor-pointer" 
              variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}
              whileHover={{ scale: 1.02, y: -1 }}
            >
              <div className="flex items-center gap-3">
                <action.icon size={20} className="text-moss" />
                <span className="font-medium text-gray-800">{action.action}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-moss font-semibold">
                +{action.points} pts 
                <ChevronRight size={16} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <motion.button className="w-full border-2 border-moss text-moss rounded-xl py-3 px-4 font-semibold hover:bg-moss hover:text-white transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg min-h-[44px]" whileHover={{ scale: 1.02 }}>
          <TreePine size={20} />
          Посадить дерево — 100 pts
        </motion.button>
        <motion.button className="w-full bg-moss text-white rounded-xl py-3 px-4 font-semibold hover:bg-moss/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-h-[44px]" whileHover={{ scale: 1.02 }}>
          <Gift size={20} />
          Скидка 10% — 500 pts
        </motion.button>
      </div>

      <div className="pt-4 border-t border-white/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div 
              className="bg-moss h-3 rounded-full" 
              initial={{ width: 0 }}
              animate={{ width: '65%' }}
              transition={{ duration: 1.5 }}
            />
          </div>
          <span className="text-sm text-volcano font-medium whitespace-nowrap">250 pts до скидки 10%</span>
        </div>
      </div>
    </motion.div>
  );
}
