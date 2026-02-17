import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        premium: {
          black: '#1a2a4e',
          border: '#2e3c5a',
          gold: '#a2d2ff',
          ice: '#7eb3ff',
        },
        gold: '#a2d2ff',
      },
      boxShadow: {
        gold: '0 8px 24px rgba(162,210,255,0.3)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #a2d2ff, #7eb3ff)',
        'gold-aurora': 'radial-gradient(1200px 600px at 20% 80%, rgba(162,210,255,0.15), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(126,179,255,0.12), transparent 60%)',
      },
    },
  },
  plugins: [],
} satisfies Config