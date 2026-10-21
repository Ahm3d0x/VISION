/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vision: {
          bg: '#040812',
          surface: '#081120',
          panel: '#0B162B',
          elevated: '#0F1E38',
          border: '#162C4E',
          'border-active': '#00D9FF',
          text: '#F0F6FC',
          'text-secondary': '#8BA2BF',
          'text-muted': '#526A8A',
          cyan: '#00D9FF',
          'cyan-bright': '#38E1FF',
          teal: '#00C896',
          gold: '#F5B700',
          amber: '#F59E0B',
          silver: '#A5B4C7',
          error: '#FF3B5C',
          success: '#00E699',
          purple: '#A855F7',
          blue: '#1E40AF',
        }
      },
      boxShadow: {
        'glow-cyan-sm': '0 0 10px rgba(0, 217, 255, 0.25)',
        'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.4)',
        'glow-cyan-lg': '0 0 35px rgba(0, 217, 255, 0.55)',
        'glow-gold': '0 0 20px rgba(245, 183, 0, 0.45)',
        'glow-error': '0 0 20px rgba(255, 59, 92, 0.45)',
        'hud-card': '0 8px 32px 0 rgba(0, 217, 255, 0.08), inset 0 0 0 1px rgba(0, 217, 255, 0.15)',
        'hud-card-active': '0 8px 32px 0 rgba(0, 217, 255, 0.2), inset 0 0 0 1px rgba(0, 217, 255, 0.4)',
        'inner-glow': 'inset 0 0 15px rgba(0, 217, 255, 0.2)',
      },
      fontFamily: {
        sans: ['"Inter"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        arabic: ['"IBM Plex Sans Arabic"', '"Inter"', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'spin-reverse': 'spin-reverse 25s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'radar': 'radar 4s linear infinite',
      },
      keyframes: {
        'spin-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        },
        'radar': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }
    },
  },
  plugins: [],
}
