'use client'

import { Home, Search, MapPin, Heart, User } from 'lucide-react'
import { useState } from 'react'

export default function BottomNav() {
  const [activeTab, setActiveTab] = useState('home')

  const tabs = [
    { id: 'home', icon: Home },
    { id: 'search', icon: Search },
    { id: 'map', icon: MapPin },
    { id: 'favorites', icon: Heart },
    { id: 'profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800">
      <div className="flex items-center justify-around px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all ${
                isActive
                  ? 'bg-orange-500 text-white scale-110'
                  : 'text-slate-400 hover:text-slate-300 active:scale-95'
              }`}
              aria-label={tab.id}
            >
              <Icon className="w-6 h-6" strokeWidth={2} />
            </button>
          )
        })}
      </div>
    </nav>
  )
}