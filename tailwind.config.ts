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
        /* Kamchatka palette */
        night:    '#0D1117',
        stone:    '#161B22',
        ash:      '#21262D',
        fog:      '#30363D',
        snow:     '#F0F6FC',
        mist:     '#8B949E',
        smoke:    '#484F58',
        lava:     '#E8734A',
        ocean:    '#00A8CC',
        moss:     '#3FB950',
        'ash-red':'#F85149',

        /* Legacy compat */
        kh: {
          bg:     '#0D1117',
          card:   '#21262D',
          text:   '#F0F6FC',
          muted:  '#8B949E',
          accent: '#E8734A',
          cyan:   '#00A8CC',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
