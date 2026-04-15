import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        display: ['Literata', 'serif']
      },
      colors: {
        ink: '#16242d',
        stone: '#f2f6f9',
        shell: '#ffffff',
        olive: '#2f7384',
        rust: '#b96b78',
        line: 'rgba(22, 33, 40, 0.12)'
      },
      boxShadow: {
        card: '0 24px 70px rgba(19, 33, 42, 0.1)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.82)'
      },
      animation: {
        'fade-up': 'fadeUp 0.55s ease forwards',
        drift: 'drift 16s ease-in-out infinite'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(12px, -10px, 0)' }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
