import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* iOS Light Theme */
        kh: {
          bg:          '#C8D4E3',
          card:        'rgba(255,255,255,0.85)',
          'card-solid':'#FFFFFF',
          nav:         'rgba(255,255,255,0.85)',
          text:        '#1A1A2E',
          muted:       '#6B7A99',
          faint:       '#9AA5BC',
          accent:      '#4A7FD4',
          gold:        '#FFB800',
          /* Dark overrides used via dark: prefix */
          'dark-bg':   '#0B1120',
          'dark-card': 'rgba(255,255,255,0.07)',
          'dark-nav':  'rgba(13,27,42,0.95)',
          cyan:        '#00D4FF',
        },
        ocean: '#0EA5E9',
        volcano: '#64748B',
        moss: '#84CC16',
        /* Premium card design tokens — used across TourCard, AccommodationCard etc. */
        'premium-gold':  '#d4af37',
        'premium-black': '#0a0a0a',
        /* Cyberpunk accent — cyan neon for focus rings, active states, glow effects */
        'cyber-cyan':    '#00D4FF',
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config