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
        ocean:   '#0EA5E9',
        volcano: '#64748B',
        moss:    '#84CC16',
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
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config