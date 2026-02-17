import Image from 'next/image'
import { Mountain, Bear, Fish, Wind, Footprints, Helicopter, Waves, Music, Search, Mic, Star } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import CategoryIcon from '@/components/CategoryIcon'
import TourCard from '@/components/TourCard'

export default function Home() {
  const categories = [
    { icon: Mountain, color: 'bg-cyan-500' },
    { icon: Bear, color: 'bg-cyan-500' },
    { icon: Fish, color: 'bg-cyan-500' },
    { icon: Wind, color: 'bg-cyan-500' },
    { icon: Footprints, color: 'bg-cyan-500' },
    { icon: Helicopter, color: 'bg-cyan-500' },
    { icon: Waves, color: 'bg-cyan-500' },
    { icon: Music, color: 'bg-cyan-500' },
  ]

  const tours = [
    {
      id: 1,
      title: 'Volasiriy Typ',
      price: 85000,
      rating: 4.9,
      image: '/tours/volcano-tour.jpg',
    },
    {
      id: 2,
      title: 'Медвежья рыбалка',
      price: 120000,
      rating: 4.8,
      image: '/tours/bear-fishing.jpg',
    },
    {
      id: 3,
      title: 'Термальные источники',
      price: 65000,
      rating: 4.7,
      image: '/tours/thermal.jpg',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-20">
      {/* Hero Background with Volcano */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-orange-900/20 via-slate-900/50 to-transparent pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(ellipse at top, rgba(251, 146, 60, 0.15), transparent 50%)',
           }}>
      </div>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative z-10 px-4 pt-6 space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold tracking-tight">KH</h1>
            <p className="text-xs text-slate-400 mt-0.5">Kamchatour Hub</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск направления"
              className="w-full bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
            <Mic className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
          
          {/* Find Button */}
          <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98]">
            Найти
          </button>
        </div>

        {/* Categories - Icons Only */}
        <div className="py-4">
          <div className="grid grid-cols-4 gap-4">
            {categories.map((category, index) => (
              <CategoryIcon key={index} icon={category.icon} color={category.color} />
            ))}
          </div>
        </div>

        {/* Tours Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Популярные туры</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </div>

        {/* Spacer for bottom nav */}
        <div className="h-8"></div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}