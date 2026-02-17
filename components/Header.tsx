'use client'

import { Sun, Moon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

export default function Header() {
  const [isDark, setIsDark] = useState(true)

  return (
    <header className="relative z-20 px-4 pt-4 pb-2 flex items-center justify-between">
      {/* Kuzmic Avatar */}
      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-500 shadow-lg">
        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-2xl font-bold">
          К
        </div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="w-12 h-12 rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-orange-400" />
        ) : (
          <Moon className="w-5 h-5 text-slate-400" />
        )}
      </button>
    </header>
  )
}