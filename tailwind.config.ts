import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class', // Включаем dark mode через класс
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Старые цвета (совместимость)
        premium: {
          black: '#000000',
          border: '#222222',
          gold: '#E6C149',
          ice: '#A2D2FF',
        },
        gold: '#E6C149',
        'ultramarine': '#0047AB',
        'deep-blue': '#003366',
        'light-blue': '#4A90E2',
        'sky-blue': '#87CEEB',
        
        // Новые цвета 2025
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        secondary: {
          DEFAULT: '#ec4899',
        },
        accent: {
          DEFAULT: '#14b8a6',
        },
      },
      boxShadow: {
        gold: '0 8px 24px rgba(230,193,73,0.25)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #E6C149, #A2D2FF)',
        'gold-aurora': 'radial-gradient(1200px 600px at 20% 80%, rgba(230,193,73,0.18), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(162,210,255,0.12), transparent 60%)',
      },
    },
  },
  plugins: [],
} satisfies Config