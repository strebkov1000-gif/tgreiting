/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main background colors - Dark Blue
        dark: {
          50: '#1e3a5f',
          100: '#1a3255',
          200: '#162a4a',
          300: '#122240',
          400: '#0e1a35',
          500: '#0a1628', // Main dark blue background
          600: '#081220',
          700: '#060e18',
          800: '#040a10',
          900: '#020508',
        },
        // Accent blue for highlights
        accent: {
          50: '#e6f4ff',
          100: '#bae3ff',
          200: '#7cc4ff',
          300: '#47a9ff',
          400: '#2196f3', // Primary accent
          500: '#1976d2',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#0a3d8f',
          900: '#072c6b',
        },
        // Ice blue for special elements
        ice: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Gray scale
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spin-slow': 'spinSlow 4s ease-in-out infinite',
        // Club icon animations
        'club-pulse': 'clubPulse 2s ease-in-out infinite',
        'club-bounce': 'clubBounce 2s ease-in-out infinite',
        'club-float': 'clubFloat 3s ease-in-out infinite',
        'club-glow': 'clubGlow 2.5s ease-in-out infinite',
        // Page transitions
        'page-enter': 'pageEnter 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(33, 150, 243, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(33, 150, 243, 0.6)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(15deg)' },
          '75%': { transform: 'rotate(-15deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        // Club icon keyframes
        clubPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
        clubBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        clubFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-3px) rotate(2deg)' },
          '75%': { transform: 'translateY(2px) rotate(-2deg)' },
        },
        clubGlow: {
          '0%, 100%': { filter: 'brightness(1) drop-shadow(0 0 3px rgba(0,212,255,0.4))' },
          '50%': { filter: 'brightness(1.15) drop-shadow(0 0 8px rgba(0,212,255,0.7))' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(33, 150, 243, 0.4)',
        'glow-lg': '0 0 40px rgba(33, 150, 243, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(33, 150, 243, 0.2)',
      },
    },
  },
  plugins: [],
}
