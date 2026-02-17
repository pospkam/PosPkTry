import Image from 'next/image'
import { Star } from 'lucide-react'

interface TourCardProps {
  tour: {
    id: number
    title: string
    price: number
    rating: number
    image: string
  }
}

export default function TourCard({ tour }: TourCardProps) {
  return (
    <div className="flex-shrink-0 w-[280px] bg-white/95 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all group">
      {/* Tour Image */}
      <div className="relative h-48 bg-gradient-to-br from-slate-600 to-slate-700 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          {/* Placeholder - replace with actual images */}
          <span className="text-sm">Фото тура</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      </div>

      {/* Tour Info */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-slate-900 dark:text-white font-semibold text-base line-clamp-1">
          {tour.title}
        </h3>

        {/* Price and Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-orange-500 font-bold text-xl">
              от {tour.price.toLocaleString('ru-RU')}
            </span>
            <span className="text-orange-500 text-sm">₽</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">
              {tour.rating}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}