'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, Star, Leaf, Heart, ArrowRight, User } from 'lucide-react';
import { Tour } from '@/types';
import { cn } from '@/lib/utils';

interface TourCardProps {
  tour: Tour & { isEco?: boolean; ecoPoints?: number };
  className?: string;
}

export function TourCard({ tour, className }: TourCardProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU').format(amount);

  return (
    <Link href={`/tours/${tour.id}`} className="block group">
      <motion.div
        className={cn(
          "tour-card bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 relative min-h-[420px] max-w-sm mx-auto",
          className
        )}
        whileHover={{ y: -8 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="tour-image relative overflow-hidden h-60">
          <Image 
            src={tour.images?.[0] || '/placeholder-tour.jpg'} 
            alt={tour.title}
            fill 
            className="object-cover group-hover:scale-110 transition-transform duration-500" 
            sizes="(max-width: 768px) 100vw, 320px"
          />
          {tour.difficulty && (
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-volcano shadow-md">
              {tour.difficulty === 'easy' ? 'Легко' : tour.difficulty === 'medium' ? 'Средне' : 'Сложно'}
            </span>
          )}
          {tour.isEco && (
            <motion.div 
              className="absolute top-4 right-4 bg-moss text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 eco-badge shadow-md"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
            >
              <Leaf size={12} />
              Эко-тур
            </motion.div>
          )}
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 line-clamp-2 group-hover:text-ocean transition-colors">{tour.title}</h3>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{tour.description}</p>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-volcano flex items-center gap-1">
              <Clock size={16} />
              {tour.duration}
            </span>
            {tour.rating && (
              <span className="text-sm text-moss flex items-center gap-1 font-semibold">
                <Star size={16} fill="currentColor" className="text-yellow-500" />
                {tour.rating}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-ocean mb-3">
            от {formatCurrency(tour.priceFrom || tour.price)} ₽ / чел.
          </div>
          {tour.ecoPoints && (
            <div className="text-sm font-medium text-moss flex items-center gap-1 mb-4">
              <Leaf size={16} />
              +{tour.ecoPoints} pts
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <motion.button className="bg-ocean text-white rounded-lg flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 hover:bg-ocean/90 transition-all min-h-[44px]" whileHover={{ scale: 1.02 }}>
              Забронировать
              <ArrowRight size={16} />
            </motion.button>
            <motion.button className="p-3 border-2 border-ocean text-ocean rounded-xl hover:bg-ocean hover:text-white transition-all min-h-[44px] min-w-[44px]" whileHover={{ scale: 1.1 }}>
              <Heart size={20} />
            </motion.button>
          </div>
        </div>
        <motion.div 
          className="absolute inset-0 bg-gradient-to-t from-ocean/5 via-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        />
      </motion.div>
    </Link>
  );
}
