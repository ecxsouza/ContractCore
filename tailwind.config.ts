import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ContractCore Design System
        brand: {
          50:  '#eef4fb',
          100: '#d5e6f5',
          200: '#aecceb',
          300: '#7eb0de',
          400: '#4a8db7',
          500: '#2c6fa0',
          600: '#1a5585',
          700: '#15426a',
          800: '#0f2f4e',  // azul petróleo escuro
          900: '#0a1f35',  // quase preto azulado
          950: '#060f1a',
        },
        gold: {
          300: '#f0d080',
          400: '#e8c060',
          500: '#d4a843',  // dourado discreto
          600: '#b8921e',
        },
        slate: {
          850: '#1a2332',
          950: '#0d1117',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'Times New Roman', 'serif'],
        mono:    ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06)',
        'card-md': '0 4px 24px rgba(0,0,0,.09)',
        'card-lg': '0 8px 48px rgba(0,0,0,.12)',
        'glow':    '0 0 24px rgba(44,111,160,.25)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in':     'fadeIn .25s ease',
        'slide-up':    'slideUp .3s ease',
        'slide-right': 'slideRight .25s ease',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:     { from: { opacity: '0' },                    to: { opacity: '1' } },
        slideUp:    { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      backgroundImage: {
        'gradient-brand':   'linear-gradient(135deg, #0f2f4e 0%, #1a5585 50%, #2c6fa0 100%)',
        'gradient-surface': 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        'dot-pattern':      "radial-gradient(circle, #1a5585 1px, transparent 1px)",
      },
      backgroundSize: {
        'dot': '24px 24px',
      },
    },
  },
  plugins: [],
};

export default config;
